import { z } from "zod";
import { documentNameSchema } from "./document-name.js";

export const COVER_LETTER_LIMITS = {
  minParagraphs: 3,
  maxParagraphs: 5,
  lineMaxLength: 200,
  paragraphMaxLength: 2_000,
} as const;

const requiredText = z.string().trim().min(1);

// The writer's name and contact details come from their primary resume when
// the letter is shown or exported, never from the model.
export const coverLetterInputSchema = z.object({
  name: documentNameSchema,
  greeting: requiredText
    .max(COVER_LETTER_LIMITS.lineMaxLength)
    .describe('For example "Dear Hiring Team,"'),
  paragraphs: z
    .array(requiredText.max(COVER_LETTER_LIMITS.paragraphMaxLength))
    .min(COVER_LETTER_LIMITS.minParagraphs)
    .max(COVER_LETTER_LIMITS.maxParagraphs)
    .describe(
      `${COVER_LETTER_LIMITS.minParagraphs} to ${COVER_LETTER_LIMITS.maxParagraphs} paragraphs`,
    ),
  signOff: requiredText
    .max(COVER_LETTER_LIMITS.lineMaxLength)
    .describe('For example "Kind regards,"; the name is added for you'),
});

export type CoverLetterInput = z.infer<typeof coverLetterInputSchema>;
