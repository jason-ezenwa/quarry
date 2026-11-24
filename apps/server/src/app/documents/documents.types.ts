import type {
  CoverLetterDocumentResponse,
  DocumentKind,
  TailoredResumeDocumentResponse,
} from '@quarry/contracts';

// Fit reports aren't exported.
export type ExportableKind = Exclude<DocumentKind, 'fit-score'>;

export type ExportableDocument =
  TailoredResumeDocumentResponse | CoverLetterDocumentResponse;
