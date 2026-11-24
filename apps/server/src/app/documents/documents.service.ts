import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  computeFitOverall,
  type FitScoreDocumentResponse,
  type FitScoreInput,
} from '@quarry/contracts';
import { Model, Types } from 'mongoose';
import { parseObjectId } from '../common/object-id';
import type { SessionContext } from '../common/common.types';
import { toFitScoreResponse } from './documents.utils';
import {
  FitScore,
  FitScoreDimension,
  FitScoreDimensions,
  FitScoreDocument,
} from './fit-score.schema';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectModel(FitScore.name)
    private readonly fitScoreModel: Model<FitScoreDocument>,
  ) {}

  // The overall is computed here; the model never gives it.
  async createFitScore(
    { userId, sessionId }: SessionContext,
    input: FitScoreInput,
  ): Promise<FitScoreDocument> {
    const fitScore = new FitScore();
    fitScore.user = new Types.ObjectId(userId);
    fitScore.session = new Types.ObjectId(sessionId);
    fitScore.title = input.name;
    fitScore.role = input.role;
    fitScore.company = input.company;
    fitScore.dimensions = this.toDimensions(input.dimensions);
    fitScore.strengths = input.strengths;
    fitScore.gaps = input.gaps;
    fitScore.overall = computeFitOverall(input.dimensions);

    const saved = await new this.fitScoreModel(fitScore).save();

    this.logger.log('Fit score saved', {
      userId,
      sessionId,
      documentId: saved.id,
      overall: Math.round(saved.overall),
    });

    return saved;
  }

  async getFitScore(
    { userId, sessionId }: SessionContext,
    documentId: string,
  ): Promise<FitScoreDocumentResponse> {
    const id = parseObjectId(documentId);
    const session = parseObjectId(sessionId);

    const fitScore =
      id && session
        ? await this.fitScoreModel.findOne({
            _id: id,
            user: new Types.ObjectId(userId),
            session,
          })
        : null;

    if (!fitScore) throw new NotFoundException('Document not found');

    return toFitScoreResponse(fitScore);
  }

  // Each session's latest fit report overall, unrounded.
  async latestFitOveralls(
    sessionIds: Types.ObjectId[],
  ): Promise<Map<string, number>> {
    const latest = await this.fitScoreModel.aggregate<{
      _id: Types.ObjectId;
      overall: number;
    }>([
      { $match: { session: { $in: sessionIds } } },
      { $sort: { session: 1, createdAt: -1 } },
      { $group: { _id: '$session', overall: { $first: '$overall' } } },
    ]);

    return new Map(
      latest.map(({ _id, overall }) => [_id.toHexString(), overall]),
    );
  }

  private toDimensions(input: FitScoreInput['dimensions']): FitScoreDimensions {
    const toDimension = ({ score, detail }: FitScoreDimension) => {
      const dimension = new FitScoreDimension();
      dimension.score = score;
      dimension.detail = detail;

      return dimension;
    };

    const dimensions = new FitScoreDimensions();
    dimensions.requirements = toDimension(input.requirements);
    dimensions.skills = toDimension(input.skills);
    dimensions.seniority = toDimension(input.seniority);
    dimensions.domain = toDimension(input.domain);

    return dimensions;
  }
}
