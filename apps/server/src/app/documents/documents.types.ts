import type {
  CoverLetterDocumentResponse,
  TailoredResumeDocumentResponse,
} from '@quarry/contracts';

export type ExportableDocument =
  TailoredResumeDocumentResponse | CoverLetterDocumentResponse;
