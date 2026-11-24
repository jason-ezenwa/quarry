import type { ExportFormat } from '@quarry/contracts';
import { join } from 'node:path';

export const EXPORT_FALLBACK_FILE_NAME = 'document';

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// Section headings, in the order a resume shows them. The summary has none.
export const RESUME_HEADINGS = {
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
} as const;

// The one template's look, shared by the PDF and the DOCX. Sizes in points.
export const EXPORT_STYLE = {
  colors: { text: '1C1917', muted: '57534E', rule: 'D6D3D1' },
  fontSize: { body: 10, name: 20, heading: 9 },
  margin: { vertical: 40, horizontal: 48 },
  pageWidth: 595.28,
  lineHeight: 1.4,
  // contact: above the contact line in the PDF. Word sets the name on a taller
  // line, which gives the DOCX about the same gap without it.
  gap: { paragraph: 10, entry: 8, section: 12, contact: 10 },
} as const;

// The Quarry typeface, bundled so names in any Latin script render (the
// PDF's built-in Helvetica drops letters such as Ọ and Ẹ).
export const PDF_FONT = {
  family: 'Ezenwa Grotesk',
  regular: join(__dirname, 'fonts', 'EzenwaGrotesk-Regular.ttf'),
  bold: join(__dirname, 'fonts', 'EzenwaGrotesk-Bold.ttf'),
} as const;

// Word substitutes its closest match where Helvetica isn't installed.
export const DOCX_FONT = 'Helvetica';
