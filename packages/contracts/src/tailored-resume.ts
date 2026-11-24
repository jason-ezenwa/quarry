import { z } from "zod";
import { documentNameSchema } from "./document-name.js";
import { resumeSchema } from "./resume.js";

const sections = resumeSchema.shape;

// Each given section replaces the source's whole; an unknown one is refused.
export const resumeSectionsSchema = z
  .strictObject({
    name: sections.name.optional(),
    contact: sections.contact.optional(),
    summary: sections.summary,
    experience: sections.experience.optional(),
    education: sections.education.optional(),
    skills: sections.skills.optional(),
    projects: sections.projects.optional(),
    certifications: sections.certifications.optional(),
  })
  .refine((given) => Object.keys(given).length > 0, {
    message: "Give at least one section",
  });

export type ResumeSections = z.infer<typeof resumeSectionsSchema>;

export const createTailoredResumeInputSchema = z.object({
  name: documentNameSchema,
  resume: resumeSchema.describe(
    "The whole tailored resume. Start the name and contact details from the primary resume and change them only when the user asks.",
  ),
});

export type CreateTailoredResumeInput = z.infer<
  typeof createTailoredResumeInputSchema
>;

export const editTailoredResumeInputSchema = z.object({
  sourceResumeId: z
    .string()
    .describe("The id of the tailored resume in this session to start from"),
  name: documentNameSchema,
  sections: resumeSectionsSchema.describe(
    "Only the sections that change, each given whole, including the name or contact details when the user asks to change them. Every other section is copied from the source.",
  ),
});

export type EditTailoredResumeInput = z.infer<
  typeof editTailoredResumeInputSchema
>;
