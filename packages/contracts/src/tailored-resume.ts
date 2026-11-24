import { z } from "zod";
import { documentNameSchema } from "./document-name.js";
import { resumeSchema } from "./resume.js";

// A tailored resume's body. The name and contact details at the top always
// come from the primary resume, so a resume and a cover letter share them.
export const tailoredResumeContentSchema = resumeSchema.omit({
  name: true,
  contact: true,
});

export type TailoredResumeContent = z.infer<typeof tailoredResumeContentSchema>;

const sections = tailoredResumeContentSchema.shape;

// Each given section replaces the source's whole; an unknown one is refused.
export const resumeSectionsSchema = z
  .strictObject({
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
  resume: tailoredResumeContentSchema.describe(
    "The whole tailored resume, without the person's name and contact details",
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
    "Only the sections that change, each given whole. Every other section is copied from the source.",
  ),
});

export type EditTailoredResumeInput = z.infer<
  typeof editTailoredResumeInputSchema
>;
