import { z } from "zod";
import { resumeSchema } from "./resume.js";

// The name and contact details at the top of a tailored resume or a cover
// letter. Each document stores its own.
export const documentHeaderSchema = z.object({
  name: resumeSchema.shape.name,
  contact: resumeSchema.shape.contact,
});

export type DocumentHeader = z.infer<typeof documentHeaderSchema>;
