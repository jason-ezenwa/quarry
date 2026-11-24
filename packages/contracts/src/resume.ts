import { z } from "zod";
import { requiredText } from "./required-text.js";
import type { UploadMimeType } from "./uploads.js";

// "YYYY" or "YYYY-MM": resumes often give only a year.
export const PARTIAL_DATE_PATTERN = /^\d{4}(-(0[1-9]|1[0-2]))?$/;

export const RESUME_KINDS = ["primary", "tailored"] as const;
export type ResumeKind = (typeof RESUME_KINDS)[number];

export const PARSE_STATUSES = ["parsing", "parsed", "failed"] as const;
export type ParseStatus = (typeof PARSE_STATUSES)[number];

const partialDate = z.string().regex(PARTIAL_DATE_PATTERN);
const httpUrl = z.url({ protocol: /^https?$/ });

export const resumeSchema = z.object({
  name: requiredText,
  contact: z.object({
    email: z.string().optional(),
    phone: z.string().optional(),
    location: z.string().optional(),
    links: z.array(z.object({ label: requiredText, url: httpUrl })),
  }),
  summary: z.string().optional(),
  experience: z.array(
    z.object({
      title: requiredText,
      company: requiredText,
      location: z.string().optional(),
      startDate: partialDate.optional(),
      // Absent means the role is current.
      endDate: partialDate.optional(),
      bullets: z.array(z.string()),
    }),
  ),
  education: z.array(
    z.object({
      school: requiredText,
      qualification: z.string().optional(),
      field: z.string().optional(),
      endDate: partialDate.optional(),
      details: z.array(z.string()),
    }),
  ),
  skills: z.array(z.object({ name: requiredText })),
  projects: z.array(
    z.object({
      name: requiredText,
      description: z.string().optional(),
      url: httpUrl.optional(),
      bullets: z.array(z.string()),
    }),
  ),
  certifications: z.array(
    z.object({
      name: requiredText,
      issuer: z.string().optional(),
      date: partialDate.optional(),
    }),
  ),
});

export type Resume = z.infer<typeof resumeSchema>;

// The uploaded file behind a primary resume, as the client sees it.
export type ResumeFileSummary = {
  originalName: string;
  mimeType: UploadMimeType;
  size: number;
};

export type PrimaryResumeResponse = {
  id: string;
  parseStatus: ParseStatus;
  parsedAt: string | null;
  reviewedAt: string | null;
  file: ResumeFileSummary;
  // Null until the first successful parse.
  resume: Resume | null;
};
