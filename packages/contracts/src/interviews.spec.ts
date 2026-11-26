import { describe, expect, it } from "vitest";
import { interviewFeedbackSchema, setupInterviewInputSchema } from "./interviews.js";

const stronger = { question: "Why us?", said: "I like it.", stronger: "I built…" };

const feedback = {
  wentWell: ["Clear structure.", "Concrete numbers."],
  toImprove: ["Shorter intros.", "Name the trade-off."],
  strongerAnswers: [stronger],
  additionalNotes: "",
};

describe("interviewFeedbackSchema", () => {
  it("takes 2-4 went well, 2-4 to improve and 1-3 stronger answers", () => {
    expect(interviewFeedbackSchema.safeParse(feedback).success).toBe(true);
  });

  it.each([
    ["one went well", { wentWell: ["Clear."] }],
    ["five went well", { wentWell: ["a", "b", "c", "d", "e"] }],
    ["one to improve", { toImprove: ["Shorter."] }],
    ["five to improve", { toImprove: ["a", "b", "c", "d", "e"] }],
    ["no stronger answer", { strongerAnswers: [] }],
    ["four stronger answers", { strongerAnswers: [stronger, stronger, stronger, stronger] }],
  ])("refuses %s", (_case, change) => {
    expect(interviewFeedbackSchema.safeParse({ ...feedback, ...change }).success).toBe(false);
  });
});

describe("setupInterviewInputSchema", () => {
  it.each([
    [3, false],
    [4, true],
    [8, true],
    [9, false],
  ])("%i questions is valid: %s", (totalQuestions, valid) => {
    expect(setupInterviewInputSchema.safeParse({ title: "Technical round", totalQuestions }).success).toBe(valid);
  });
});
