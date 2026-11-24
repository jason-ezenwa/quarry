import { describe, expect, it } from "vitest";
import {
  computeFitOverall,
  fitLabelFor,
  fitScoreInputSchema,
  type FitScoreInput,
} from "./fit-score.js";

const dimensions = (
  requirements: number,
  skills: number,
  seniority: number,
  domain: number,
): FitScoreInput["dimensions"] => ({
  requirements: { score: requirements, detail: "" },
  skills: { score: skills, detail: "" },
  seniority: { score: seniority, detail: "" },
  domain: { score: domain, detail: "" },
});

const validInput: FitScoreInput = {
  name: "First read",
  role: "Backend Engineer",
  company: "Paystack",
  dimensions: {
    requirements: { score: 7.9, detail: "5 of 7 met, 1 partial" },
    skills: { score: 8.9, detail: "Strong overlap" },
    seniority: { score: 8.5, detail: "Senior, matches" },
    domain: { score: 10, detail: "Payments" },
  },
  strengths: ["Six years in payments."],
  gaps: ["No Kafka."],
};

describe("computeFitOverall", () => {
  it("weights the dimensions 40, 25, 20 and 15 out of 100", () => {
    expect(computeFitOverall(dimensions(7.9, 8.9, 8.5, 10))).toBeCloseTo(
      85.85,
      5,
    );
  });

  it("gives 100 for full marks and 0 for none", () => {
    expect(computeFitOverall(dimensions(10, 10, 10, 10))).toBeCloseTo(100, 5);
    expect(computeFitOverall(dimensions(0, 0, 0, 0))).toBe(0);
  });

  it("lands exactly on a half, so it rounds up like the label expects", () => {
    const overall = computeFitOverall(dimensions(2.3, 9.1, 9.6, 8.9));

    expect(overall).toBe(64.5);
    expect(Math.round(overall)).toBe(65);
    expect(fitLabelFor(overall)).toBe("good-fit");
  });

  it("counts requirements more than domain", () => {
    expect(computeFitOverall(dimensions(10, 0, 0, 0))).toBeCloseTo(40, 5);
    expect(computeFitOverall(dimensions(0, 0, 0, 10))).toBeCloseTo(15, 5);
  });
});

describe("fitLabelFor", () => {
  it.each([
    [100, "strong-fit"],
    [80, "strong-fit"],
    [79.6, "strong-fit"],
    [79.4, "good-fit"],
    [65, "good-fit"],
    [64.4, "weak-fit"],
    [0, "weak-fit"],
  ] as const)("labels %d as %s, by the rounded score", (overall, label) => {
    expect(fitLabelFor(overall)).toBe(label);
  });
});

describe("fitScoreInputSchema", () => {
  it("accepts a well-formed fit score", () => {
    expect(fitScoreInputSchema.safeParse(validInput).success).toBe(true);
  });

  it("refuses a score above 10 or with more than one decimal", () => {
    for (const score of [10.1, 7.25, -1]) {
      const input = {
        ...validInput,
        dimensions: {
          ...validInput.dimensions,
          skills: { score, detail: "x" },
        },
      };

      expect(fitScoreInputSchema.safeParse(input).success).toBe(false);
    }
  });

  it("refuses a detail longer than 60 characters", () => {
    const input = {
      ...validInput,
      dimensions: {
        ...validInput.dimensions,
        domain: { score: 5, detail: "x".repeat(61) },
      },
    };

    expect(fitScoreInputSchema.safeParse(input).success).toBe(false);
  });

  it("refuses an empty detail and an overlong list of strengths", () => {
    const emptyDetail = {
      ...validInput,
      dimensions: {
        ...validInput.dimensions,
        domain: { score: 5, detail: "" },
      },
    };

    expect(fitScoreInputSchema.safeParse(emptyDetail).success).toBe(false);
    expect(
      fitScoreInputSchema.safeParse({
        ...validInput,
        strengths: Array(11).fill("Strong."),
      }).success,
    ).toBe(false);
  });

  it("refuses a name longer than 50 characters", () => {
    expect(
      fitScoreInputSchema.safeParse({ ...validInput, name: "x".repeat(51) })
        .success,
    ).toBe(false);
  });
});
