import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  computeFitOverall,
  isExportableKind,
  mapFitDimensions,
  type ExportableKind,
  type FitScoreRef,
  type CoverLetterDocumentResponse,
  type CoverLetterInput,
  type CreateTailoredResumeInput,
  type DocumentKind,
  type DocumentResponse,
  type EditTailoredResumeInput,
  type FitScoreDocumentResponse,
  type FitScoreInput,
  type SavedDocumentRef,
} from '@quarry/contracts';
import { Model, Types } from 'mongoose';
import {
  documentNotFound,
  ownedDocumentFilter,
} from '../common/owned-document';
import type { SessionContext } from '../common/common.types';
import { ResumeService } from '../resume/resume.service';
import { CoverLetter, CoverLetterDocument } from './cover-letter.schema';
import type { ExportableDocument } from './documents.types';
import {
  toCoverLetterRef,
  toCoverLetterResponse,
  toFitScoreRef,
  toFitScoreResponse,
  toTailoredResumeRef,
} from './documents.utils';
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
    @InjectModel(CoverLetter.name)
    private readonly coverLetterModel: Model<CoverLetterDocument>,
    private readonly resumeService: ResumeService,
  ) {}

  // Any kind, as the user sees it. 404 unless it's in this session.
  async getDocument(
    owner: SessionContext,
    kind: DocumentKind,
    documentId: string,
  ): Promise<DocumentResponse> {
    return isExportableKind(kind)
      ? this.getExportable(owner, kind, documentId)
      : this.getFitScore(owner, documentId);
  }

  async getExportable(
    owner: SessionContext,
    kind: ExportableKind,
    documentId: string,
  ): Promise<ExportableDocument> {
    return kind === 'resume'
      ? this.resumeService.getTailored(owner, documentId)
      : this.getCoverLetter(owner, documentId);
  }

  // Tailored resumes live with the resume module, so they go through it.
  async createTailoredResume(
    owner: SessionContext,
    input: CreateTailoredResumeInput,
  ): Promise<SavedDocumentRef> {
    return toTailoredResumeRef(
      await this.resumeService.createTailored(owner, input),
    );
  }

  // Null when the source isn't a tailored resume in this session.
  async editTailoredResume(
    owner: SessionContext,
    input: EditTailoredResumeInput,
  ): Promise<SavedDocumentRef | null> {
    const edited = await this.resumeService.editTailored(owner, input);

    return edited ? toTailoredResumeRef(edited) : null;
  }

  // Every save is a new letter.
  async createCoverLetter(
    owner: SessionContext,
    input: CoverLetterInput,
  ): Promise<SavedDocumentRef> {
    const { userId, sessionId } = owner;
    const coverLetter = new CoverLetter();
    coverLetter.user = new Types.ObjectId(userId);
    coverLetter.session = new Types.ObjectId(sessionId);
    coverLetter.title = input.name;

    coverLetter.header =
      input.header ?? (await this.resumeService.findHeader(owner));

    coverLetter.greeting = input.greeting;
    coverLetter.paragraphs = input.paragraphs;
    coverLetter.signOff = input.signOff;

    const saved = await new this.coverLetterModel(coverLetter).save();

    this.logger.log('Cover letter saved', {
      userId,
      sessionId,
      documentId: saved.id,
    });

    return toCoverLetterRef(saved);
  }

  private async getCoverLetter(
    owner: SessionContext,
    documentId: string,
  ): Promise<CoverLetterDocumentResponse> {
    const owned = ownedDocumentFilter(owner, documentId);
    const coverLetter = owned && (await this.coverLetterModel.findOne(owned));

    if (!coverLetter) throw documentNotFound();

    return toCoverLetterResponse(coverLetter);
  }

  // The overall is computed here; the model never gives it.
  async createFitScore(
    { userId, sessionId }: SessionContext,
    input: FitScoreInput,
  ): Promise<FitScoreRef> {
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

    return toFitScoreRef(saved);
  }

  async getFitScore(
    owner: SessionContext,
    documentId: string,
  ): Promise<FitScoreDocumentResponse> {
    const owned = ownedDocumentFilter(owner, documentId);
    const fitScore = owned && (await this.fitScoreModel.findOne(owned));

    if (!fitScore) throw documentNotFound();

    return toFitScoreResponse(fitScore);
  }

  async latestCoverLetter({
    userId,
    sessionId,
  }: SessionContext): Promise<CoverLetterDocumentResponse | null> {
    const latest = await this.coverLetterModel
      .findOne({
        user: new Types.ObjectId(userId),
        session: new Types.ObjectId(sessionId),
      })
      .sort({ createdAt: -1, _id: -1 });

    return latest && toCoverLetterResponse(latest);
  }

  async latestFitScore({
    userId,
    sessionId,
  }: SessionContext): Promise<FitScoreDocumentResponse | null> {
    const latest = await this.fitScoreModel
      .findOne({
        user: new Types.ObjectId(userId),
        session: new Types.ObjectId(sessionId),
      })
      .sort({ createdAt: -1, _id: -1 });

    return latest && toFitScoreResponse(latest);
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
    return Object.assign(
      new FitScoreDimensions(),
      mapFitDimensions((key) =>
        Object.assign(new FitScoreDimension(), {
          score: input[key].score,
          detail: input[key].detail,
        }),
      ),
    );
  }
}
