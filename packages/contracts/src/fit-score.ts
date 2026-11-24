import { z } from "zod";
import { documentNameSchema } from "./document-name.js";
import { requiredText } from "./required-text.js";

// Each dimension's weight out of 100. The model scores each out of 10.
export const FIT_DIMENSIONS = {
  requirements: 40,
  skills: 25,
  seniority: 20,
  domain: 15,
} as const;

export type FitDimension = keyof typeof FIT_DIMENSIONS;

export const FIT_DIMENSION_KEYS = Object.keys(FIT_DIMENSIONS) as FitDimension[];

export const FIT_LABELS = ["strong-fit", "good-fit", "weak-fit"] as const;
export type FitLabel = (typeof FIT_LABELS)[number];

// Each label as people read it, on screen and in the agent's replies.
export const FIT_LABEL_TEXT: Record<FitLabel, string> = {
  "strong-fit": "Strong fit",
  "good-fit": "Good fit",
  "weak-fit": "Weak fit",
};

// Lowest rounded overall for each label, strongest first.
export const FIT_LABEL_BANDS: readonly { min: number; label: FitLabel }[] = [
  { min: 80, label: "strong-fit" },
  { min: 65, label: "good-fit" },
  { min: 0, label: "weak-fit" },
];

export const FIT_SCORE_LIMITS = {
  // Room for the short phrases the agent writes (up to 45 characters seen in QA).
  detailMaxLength: 60,
  roleMaxLength: 120,
  maxScore: 10,
  maxPoints: 10,
  pointMaxLength: 300,
} as const;

// Scores carry one decimal, so they are counted in tenths.
const TENTHS = 10;

// 0 to 10 with at most one decimal, such as 7.9.
const dimensionScore = z
  .number()
  .min(0)
  .max(FIT_SCORE_LIMITS.maxScore)
  .refine((score) => Number.isInteger(Number((score * TENTHS).toFixed(6))), {
    message: "Use at most one decimal",
  });

const dimension = z.object({
  score: dimensionScore.describe(
    `0 to ${FIT_SCORE_LIMITS.maxScore}, one decimal at most, e.g. 7.9`,
  ),
  detail: requiredText
    .max(FIT_SCORE_LIMITS.detailMaxLength)
    .describe(
      `A short phrase of at most ${FIT_SCORE_LIMITS.detailMaxLength} characters, e.g. "5 of 7 met, 1 partial"`,
    ),
});

const points = z
  .array(requiredText.max(FIT_SCORE_LIMITS.pointMaxLength))
  .max(FIT_SCORE_LIMITS.maxPoints)
  .describe(`Up to ${FIT_SCORE_LIMITS.maxPoints} short sentences`);

// One value per dimension, in FIT_DIMENSIONS order.
export function mapFitDimensions<T>(
  toValue: (dimension: FitDimension) => T,
): Record<FitDimension, T> {
  // Every key is set, so the cast holds.
  return Object.fromEntries(
    FIT_DIMENSION_KEYS.map((key) => [key, toValue(key)]),
  ) as Record<FitDimension, T>;
}

export const fitScoreInputSchema = z.object({
  name: documentNameSchema,
  role: requiredText
    .max(FIT_SCORE_LIMITS.roleMaxLength)
    .describe("The job title, as the posting gives it"),
  company: requiredText.max(FIT_SCORE_LIMITS.roleMaxLength).optional(),
  dimensions: z.object(mapFitDimensions(() => dimension)),
  strengths: points,
  gaps: points,
});

export type FitScoreInput = z.infer<typeof fitScoreInputSchema>;
export type FitDimensions = FitScoreInput["dimensions"];

// Out of 100, unrounded: 7.9, 8.9, 8.5 and 10 give 85.85, shown as 86.
// Summed in whole numbers and divided once, so a score that should end in
// exactly .5 does, and rounds up.
export function computeFitOverall(dimensions: FitDimensions): number {
  const weightedTenths = FIT_DIMENSION_KEYS.reduce(
    (total, key) =>
      total + Math.round(dimensions[key].score * TENTHS) * FIT_DIMENSIONS[key],
    0,
  );

  return weightedTenths / (FIT_SCORE_LIMITS.maxScore * TENTHS);
}

// Banded on the score the user sees, so 79.6 (shown as 80) is a strong fit.
export function fitLabelFor(overall: number): FitLabel {
  const shown = Math.round(overall);

  return FIT_LABEL_BANDS.find(({ min }) => shown >= min)?.label ?? "weak-fit";
}
