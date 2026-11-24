import {
  fitLabelFor,
  mapFitDimensions,
  type CoverLetterDocumentResponse,
  type FitScoreDocumentResponse,
  type FitScoreRef,
  type SavedDocumentRef,
} from '@quarry/contracts';
import type { ResumeDocument } from '../resume/resume.schema';
import { tailoredTitleOf } from '../resume/resume.utils';
import type { CoverLetterDocument } from './cover-letter.schema';
import type { FitScoreDocument } from './fit-score.schema';

// The fit report as the user sees it: rounded, each dimension out of 100.
export function toFitScoreResponse(
  fitScore: FitScoreDocument,
): FitScoreDocumentResponse {
  const { dimensions } = fitScore.toObject();

  const shown = mapFitDimensions((key) => ({
    score: Math.round(dimensions[key].score * 10),
    detail: dimensions[key].detail,
  }));

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

export function toFitScoreRef(fitScore: FitScoreDocument): FitScoreRef {
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
