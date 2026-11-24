import { z } from "zod";

// Every saved document's name, shown on its card and as its panel title.
export const DOCUMENT_NAME_MAX_LENGTH = 50;

export const documentNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(DOCUMENT_NAME_MAX_LENGTH)
  .describe(
    `A short name (at most ${DOCUMENT_NAME_MAX_LENGTH} characters) that says what is different about this document`,
  );
