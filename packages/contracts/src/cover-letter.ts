import { z } from "zod";
import { documentNameSchema } from "./document-name.js";
import { resumeSchema } from "./resume.js";

export const COVER_LETTER_LIMITS = {
  minParagraphs: 3,
  maxParagraphs: 5,
  lineMaxLength: 200,
  paragraphMaxLength: 2_000,
} as const;

const requiredText = z.string().trim().min(1);

// The name and contact details above a letter. Left out, they're copied from
// the primary resume when the letter is saved.
export const coverLetterHeaderSchema = z.object({
  name: resumeSchema.shape.name,
  contact: resumeSchema.shape.contact,
});

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
  header: coverLetterHeaderSchema
    .optional()
    .describe(
      "Only when the user wants different name or contact details on this letter; otherwise the primary resume's are used",
    ),
});

export type CoverLetterInput = z.infer<typeof coverLetterInputSchema>;
