import type { ExportFormat } from '@quarry/contracts';
import { join } from 'node:path';

export const EXPORT_FALLBACK_FILE_NAME = 'document';

export const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

export const PRESENT_LABEL = 'Present';

export const HTTP_PROTOCOL_PREFIX = /^https?:\/\//;

export const CONTACT_SEPARATOR = '  ·  ';

// Section headings, in the order a resume shows them.
export const RESUME_HEADINGS = {
  summary: 'Summary',
  experience: 'Experience',
  projects: 'Projects',
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
} as const;

// The one template's look, shared by the PDF and the DOCX. Sizes in points.
export const EXPORT_STYLE = {
  colors: { text: '1C1917', muted: '57534E', rule: 'D6D3D1' },
  fontSize: { body: 10, name: 20, heading: 9 },
  margin: { vertical: 40, horizontal: 48 },
  pageWidth: 595.28,
  lineHeight: 1.4,
  gap: { paragraph: 10, entry: 8, section: 12 },
} as const;

// The Quarry typeface, bundled so names in any Latin script render (the
// PDF's built-in Helvetica drops letters such as Ọ and Ẹ).
export const PDF_FONT = {
  family: 'Ezenwa Grotesk',
  regular: join(__dirname, 'fonts', 'EzenwaGrotesk-Regular.woff2'),
  bold: join(__dirname, 'fonts', 'EzenwaGrotesk-Bold.woff2'),
} as const;

// Word substitutes its closest match where Helvetica isn't installed.
export const DOCX_FONT = 'Helvetica';
