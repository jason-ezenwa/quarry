import { z } from "zod";
import { documentHeaderSchema } from "./document-header.js";
import { documentNameSchema } from "./document-name.js";
import { requiredText } from "./required-text.js";

export const COVER_LETTER_LIMITS = {
  minParagraphs: 3,
  maxParagraphs: 5,
  lineMaxLength: 200,
  paragraphMaxLength: 2_000,
} as const;

// Said the same way in the system prompt and the tool's description.
export const COVER_LETTER_HEADER_DEFAULT =
  "Left out, the letter takes the name and contact details of the latest tailored resume in this application, or the primary resume's when there is none.";

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
  header: documentHeaderSchema
    .optional()
    .describe(
      `Only when the user wants different name or contact details on this letter. ${COVER_LETTER_HEADER_DEFAULT}`,
    ),
});

export type CoverLetterInput = z.infer<typeof coverLetterInputSchema>;
