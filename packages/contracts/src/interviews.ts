import { z } from "zod";
import { requiredText } from "./required-text.js";
import { SESSION_LIMITS } from "./sessions.js";

export const INTERVIEW_LIMITS = {
  titleMaxLength: 80,
  questionMaxLength: 1_000,
  minWentWell: 2,
  maxWentWell: 4,
  minToImprove: 2,
  maxToImprove: 4,
  minStrongerAnswers: 1,
  maxStrongerAnswers: 3,
  pointMaxLength: 600,
  answerMaxLength: 3_000,
  additionalNotesMaxLength: 3_000,
} as const;

// Shown as the user's first message in every interview.
export const INTERVIEW_FIRST_MESSAGE = "Let's practise an interview.";

export const DEFAULT_INTERVIEW_TITLE = "New interview";

const { min: minQuestions, max: maxQuestions } =
  SESSION_LIMITS.interviewQuestions;

export const setupInterviewInputSchema = z.object({
  title: requiredText
    .max(INTERVIEW_LIMITS.titleMaxLength)
    .describe('A short name for this interview, e.g. "Technical round"'),
  totalQuestions: z
    .number()
    .int()
    .min(minQuestions)
    .max(maxQuestions)
    .describe(`How many main questions you will ask, ${minQuestions} to ${maxQuestions}`),
});

export type SetupInterviewInput = z.infer<typeof setupInterviewInputSchema>;

export const askInterviewQuestionInputSchema = z.object({
  question: requiredText
    .max(INTERVIEW_LIMITS.questionMaxLength)
    .describe("The main question, exactly as the candidate should read it"),
});

export type AskInterviewQuestionInput = z.infer<
  typeof askInterviewQuestionInputSchema
>;

// What ask_interview_question returns; the web app renders it as the numbered question.
export type AskInterviewQuestionOutput = {
  ok: true;
  number: number;
  totalQuestions: number;
};

const point = requiredText.max(INTERVIEW_LIMITS.pointMaxLength);

export const strongerAnswerSchema = z.object({
  question: requiredText
    .max(INTERVIEW_LIMITS.questionMaxLength)
    .describe("The main question or follow-up this answer was to"),
  said: requiredText
    .max(INTERVIEW_LIMITS.answerMaxLength)
    .describe("What the candidate said, quoted verbatim from their answer"),
  stronger: requiredText
    .max(INTERVIEW_LIMITS.answerMaxLength)
    .describe(
      "A stronger version, drawing only on their profile and what they said. Never invent experience",
    ),
});

export type StrongerAnswer = z.infer<typeof strongerAnswerSchema>;

export const interviewFeedbackSchema = z.object({
  wentWell: z
    .array(point)
    .min(INTERVIEW_LIMITS.minWentWell)
    .max(INTERVIEW_LIMITS.maxWentWell)
    .describe(
      `${INTERVIEW_LIMITS.minWentWell} to ${INTERVIEW_LIMITS.maxWentWell} things that went well, one sentence each`,
    ),
  toImprove: z
    .array(point)
    .min(INTERVIEW_LIMITS.minToImprove)
    .max(INTERVIEW_LIMITS.maxToImprove)
    .describe(
      `${INTERVIEW_LIMITS.minToImprove} to ${INTERVIEW_LIMITS.maxToImprove} things to improve, one sentence each`,
    ),
  strongerAnswers: z
    .array(strongerAnswerSchema)
    .min(INTERVIEW_LIMITS.minStrongerAnswers)
    .max(INTERVIEW_LIMITS.maxStrongerAnswers),
  additionalNotes: z
    .string()
    .trim()
    .max(INTERVIEW_LIMITS.additionalNotesMaxLength)
    .describe(
      "Anything beyond the rest, chiefly answers to questions the candidate asked during the interview that were left for the feedback. Empty when there is nothing",
    ),
});

export type InterviewFeedback = z.infer<typeof interviewFeedbackSchema>;

export type InterviewFollowUp = { question: string; answer: string };

export type InterviewQuestionAndAnswer = {
  question: string;
  answer: string;
  followUps: InterviewFollowUp[];
};

// An interview's state. `totalQuestions`, `endedAt` and `feedback` are absent until set.
export type InterviewState = {
  totalQuestions?: number;
  questionCount: number;
  endedAt?: string;
  feedback?: InterviewFeedback;
};

// GET /sessions/:id/interviews: an application's interviews, newest first.
export type ApplicationInterview = {
  id: string;
  title: string;
  createdAt: string;
  endedAt: string | null;
};
