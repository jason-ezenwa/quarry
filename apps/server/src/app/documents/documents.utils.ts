import {
  fitLabelFor,
  type FitScoreDocumentResponse,
  type SavedDocumentRef,
} from '@quarry/contracts';
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
