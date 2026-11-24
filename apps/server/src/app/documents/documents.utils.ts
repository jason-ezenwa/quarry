import {
  fitLabelFor,
  type CoverLetterDocumentResponse,
  type ExportFormat,
  type FitScoreDocumentResponse,
  type SavedDocumentRef,
} from '@quarry/contracts';
import type { ResumeDocument } from '../resume/resume.schema';
import { tailoredTitleOf } from '../resume/resume.utils';
import type { CoverLetterDocument } from './cover-letter.schema';
import type { ExportableDocument } from './documents.types';
import { EXPORT_FALLBACK_FILE_NAME } from './documents.constants';
import type { FitScoreDimension, FitScoreDocument } from './fit-score.schema';

// The fit report as the user sees it: rounded, each dimension out of 100.
export function toFitScoreResponse(
  fitScore: FitScoreDocument,
): FitScoreDocumentResponse {
  const { dimensions } = fitScore.toObject();

  const outOf100 = ({ score, detail }: FitScoreDimension) => ({
    score: Math.round(score * 10),
    detail,
  });

  const shown = {
    requirements: outOf100(dimensions.requirements),
    skills: outOf100(dimensions.skills),
    seniority: outOf100(dimensions.seniority),
    domain: outOf100(dimensions.domain),
  };

  return {
    id: fitScore._id.toHexString(),
    kind: 'fit-score',
    name: fitScore.title,
    role: fitScore.role,
    company: fitScore.company ?? null,
    overall: Math.round(fitScore.overall),
    label: fitLabelFor(fitScore.overall),
    dimensions: shown,
    strengths: fitScore.strengths,
    gaps: fitScore.gaps,
    createdAt: fitScore.createdAt.toISOString(),
  };
}

export function toFitScoreRef(fitScore: FitScoreDocument): SavedDocumentRef {
  return {
    kind: 'fit-score',
    id: fitScore._id.toHexString(),
    name: fitScore.title,
    score: Math.round(fitScore.overall),
    label: fitLabelFor(fitScore.overall),
  };
}

export function toTailoredResumeRef(resume: ResumeDocument): SavedDocumentRef {
  return {
    kind: 'resume',
    id: resume._id.toHexString(),
    name: tailoredTitleOf(resume),
  };
}

export function toCoverLetterRef(
  coverLetter: CoverLetterDocument,
): SavedDocumentRef {
  return {
    kind: 'cover-letter',
    id: coverLetter._id.toHexString(),
    name: coverLetter.title,
  };
}

export function toCoverLetterResponse(
  coverLetter: CoverLetterDocument,
): CoverLetterDocumentResponse {
  const { header } = coverLetter.toObject();

  return {
    id: coverLetter._id.toHexString(),
    kind: 'cover-letter',
    name: coverLetter.title,
    header,
    greeting: coverLetter.greeting,
    paragraphs: coverLetter.paragraphs,
    signOff: coverLetter.signOff,
    createdAt: coverLetter.createdAt.toISOString(),
  };
}

// A download name safe in any header: "Lead with payments" for Ada Obi
// becomes "ada-obi-lead-with-payments.pdf".
export function exportFileName(
  document: ExportableDocument,
  format: ExportFormat,
): string {
  const person =
    document.kind === 'resume' ? document.resume.name : document.header.name;

  const slug = `${person} ${document.name}`
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || EXPORT_FALLBACK_FILE_NAME}.${format}`;
}
