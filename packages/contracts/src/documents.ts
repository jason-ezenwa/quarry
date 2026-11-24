import type { DocumentHeader } from "./document-header.js";
import type { FitDimension, FitLabel } from "./fit-score.js";
import { isOneOf } from "./is-one-of.js";
import type { Resume } from "./resume.js";

export const DOCUMENT_KINDS = ["fit-score", "resume", "cover-letter"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export function isDocumentKind(value: unknown): value is DocumentKind {
  return isOneOf(DOCUMENT_KINDS, value);
}

// The kinds that download as files; fit reports don't.
export const EXPORTABLE_KINDS = ["resume", "cover-letter"] as const;
export type ExportableKind = (typeof EXPORTABLE_KINDS)[number];

export function isExportableKind(value: unknown): value is ExportableKind {
  return isOneOf(EXPORTABLE_KINDS, value);
}

export type FitScoreRef = {
  kind: "fit-score";
  id: string;
  name: string;
  score: number;
  label: FitLabel;
};

// What every tool that saves a document returns, so the web app can show a
// card for it without knowing the tool.
export type SavedDocumentRef =
  | FitScoreRef
  | { kind: ExportableKind; id: string; name: string };

export type FitScoreDocumentResponse = {
  id: string;
  kind: "fit-score";
  name: string;
  role: string;
  company: string | null;
  // Rounded, out of 100.
  overall: number;
  label: FitLabel;
  // Each score is shown out of 100.
  dimensions: Record<FitDimension, { score: number; detail: string }>;
  strengths: string[];
  gaps: string[];
  createdAt: string;
};

export type TailoredResumeDocumentResponse = {
  id: string;
  kind: "resume";
  name: string;
  resume: Resume;
  // The resume this one was edited from; null when it was written whole.
  sourceResume: string | null;
  createdAt: string;
};

export type CoverLetterDocumentResponse = {
  id: string;
  kind: "cover-letter";
  name: string;
  header: DocumentHeader;
  greeting: string;
  paragraphs: string[];
  signOff: string;
  createdAt: string;
};

export type DocumentResponse =
  | FitScoreDocumentResponse
  | TailoredResumeDocumentResponse
  | CoverLetterDocumentResponse;

export const EXPORT_FORMATS = ["pdf", "docx"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
