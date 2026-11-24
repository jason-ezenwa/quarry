import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  SESSION_LIMITS,
  type CreateSessionResponse,
  type FitScoreInput,
  type MonthlySessionLimitError,
  type SavedDocumentRef,
  type SessionDetail,
  type SessionErrorCode,
  type SessionPage,
  type SessionSummary,
  type UsageResponse,
} from '@quarry/contracts';
import { generateId, type UIMessage } from 'ai';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import { parseObjectId } from '../common/object-id';
import { isDuplicateKeyError } from '../../lib/mongo-errors/mongo-errors';
import { DocumentsService } from '../documents/documents.service';
import { toFitScoreRef } from '../documents/documents.utils';
import { ResumeService } from '../resume/resume.service';
import type { CreateSessionDto } from './dto/create-session.dto';
import type { ListSessionsDto } from './dto/list-sessions.dto';
import type { TurnMessageDto } from './dto/run-turn.dto';
import { JobFetcherService } from './job-fetcher/job-fetcher.service';
import type { JobFetchOutcome } from './job-fetcher/job-fetcher.types';
import { Message, MessageDocument, MessageUsage } from './message.schema';
import {
  ApplicationSession,
  ApplicationSessionDocument,
  SessionJob,
} from './session.schema';
import { DEFAULT_SESSION_TITLE } from './sessions.constants';
import type { SessionContext } from '../common/common.types';
import type { ClaimedTurn } from './sessions.types';
import {
  firstMessageText,
  monthlyPeriod,
  toSessionDetail,
  toSessionSummary,
} from './sessions.utils';

function sessionError(
  status: HttpStatus,
  code: SessionErrorCode,
  message: string,
): HttpException {
  return new HttpException({ statusCode: status, code, message }, status);
}

function turnRunningError(): HttpException {
  return sessionError(
    HttpStatus.CONFLICT,
    'turn-running',
    'A reply is still being written',
  );
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectModel(ApplicationSession.name)
    private readonly sessionModel: Model<ApplicationSessionDocument>,
    @InjectModel(Message.name)
    private readonly messageModel: Model<MessageDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly resumeService: ResumeService,
    private readonly documentsService: DocumentsService,
    private readonly jobFetcherService: JobFetcherService,
  ) {}

  // Counts against the monthly cap from here, even if the job never loads.
  async create(
    userId: string,
    dto: CreateSessionDto,
  ): Promise<CreateSessionResponse> {
    if (!(await this.resumeService.findReviewedPrimaryContent(userId))) {
      throw sessionError(
        HttpStatus.CONFLICT,
        'primary-resume-not-ready',
        'Review your primary resume before starting an application',
      );
    }

    await this.assertUnderMonthlyCap(userId);

    const session = new ApplicationSession();
    session.user = new Types.ObjectId(userId);
    session.title = DEFAULT_SESSION_TITLE;
    session.userMessageCount = 1;
    session.turnStartedAt = null;
    session.archivedAt = null;

    if (dto.jobDescription !== undefined) {
      const job = new SessionJob();
      job.source = 'pasted';
      job.description = dto.jobDescription;
      session.job = job;
    } else if (dto.jobUrl !== undefined) {
      const job = new SessionJob();
      job.url = dto.jobUrl;
      session.job = job;
    }

    const created = await this.connection.transaction(async (transaction) => {
      const saved = await new this.sessionModel(session).save({
        session: transaction,
      });

      await this.insertUserMessage(
        saved._id,
        { id: generateId(), text: firstMessageText(dto) },
        transaction,
      );

      return saved;
    });

    this.logger.log('Application session created', {
      userId,
      sessionId: created.id,
      source: created.job?.source ?? 'link',
    });

    return { id: created.id };
  }

  // Newest first; ties on createdAt fall back to the id, so pages never
  // skip or repeat a session.
  async list(userId: string, query: ListSessionsDto): Promise<SessionPage> {
    const limit = query.limit ?? SESSION_LIMITS.sessionsPageSize;
    const sessions = await this.sessionModel
      .find({
        ...this.ownedBy(userId),
        archivedAt: query.archived ? { $ne: null } : null,
        ...(query.cursor ? await this.afterCursor(userId, query.cursor) : {}),
      })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1);

    const page = sessions.slice(0, limit);
    const overalls = await this.documentsService.latestFitOveralls(
      page.map((session) => session._id),
    );

    return {
      items: page.map((session) =>
        toSessionSummary(session, overalls.get(session.id) ?? null),
      ),
      nextCursor: sessions.length > limit ? page[page.length - 1].id : null,
    };
  }

  private async afterCursor(userId: string, cursor: string) {
    const last = await this.sessionModel
      .findOne({ _id: cursor, ...this.ownedBy(userId) })
      .select('createdAt');

    if (!last) throw new BadRequestException('Unknown cursor');

    return {
      $or: [
        { createdAt: { $lt: last.createdAt } },
        { createdAt: last.createdAt, _id: { $lt: last._id } },
      ],
    };
  }

  async get(userId: string, sessionId: string): Promise<SessionDetail> {
    const session = await this.findOwned(userId, sessionId);

    return toSessionDetail(session, await this.history(session._id));
  }

  // Archiving never gives back a slot in the monthly cap.
  async setArchived(
    userId: string,
    sessionId: string,
    archived: boolean,
  ): Promise<SessionSummary> {
    const id = parseObjectId(sessionId);

    const updated =
      id &&
      (await this.sessionModel.findOneAndUpdate(
        { _id: id, ...this.ownedBy(userId) },
        { $set: { archivedAt: archived ? new Date() : null } },
        { returnDocument: 'after' },
      ));

    if (!updated) throw new NotFoundException('Session not found');

    const overalls = await this.documentsService.latestFitOveralls([
      updated._id,
    ]);

    return toSessionSummary(updated, overalls.get(updated.id) ?? null);
  }

  async usage(userId: string): Promise<UsageResponse> {
    const { start, resetsAt } = monthlyPeriod(new Date());

    return {
      sessions: {
        used: await this.countCreatedSince(userId, start),
        limit: SESSION_LIMITS.sessionsPerMonth,
        resetsAt: resetsAt.toISOString(),
      },
    };
  }

  // One atomic update takes the lock, so of two overlapping turns only one
  // runs. With a message, the same transaction counts and stores it.
  async claimTurn(
    userId: string,
    sessionId: string,
    sent: TurnMessageDto | undefined,
  ): Promise<ClaimedTurn> {
    const id = parseObjectId(sessionId);
    if (!id) throw new NotFoundException('Session not found');

    // A retried request runs on the message it already stored, so the
    // message is never stored or counted twice.
    const message =
      sent &&
      !(await this.messageModel.exists({
        session: id,
        uiId: sent.id,
        role: 'user',
      }))
        ? sent
        : undefined;

    const startedAt = new Date();

    const claimed = await this.connection
      .transaction(async (transaction) => {
        const session = await this.sessionModel.findOneAndUpdate(
          {
            _id: id,
            ...this.ownedBy(userId),
            turnStartedAt: null,
            archivedAt: null,
            ...(message && {
              userMessageCount: { $lt: SESSION_LIMITS.userMessagesPerSession },
            }),
          },
          {
            $set: { turnStartedAt: startedAt },
            ...(message && { $inc: { userMessageCount: 1 } }),
          },
          { returnDocument: 'after', session: transaction },
        );

        if (session && message) {
          await this.insertUserMessage(session._id, message, transaction);
        }

        return session;
      })
      .catch((error: unknown) => {
        // The same message, sent twice at once: the other request has it.
        if (isDuplicateKeyError(error)) throw turnRunningError();
        throw error;
      });

    if (!claimed) return this.throwTurnRefusal(userId, id, Boolean(message));

    const turn: ClaimedTurn = { userId, sessionId: claimed.id, startedAt };

    if (!message) {
      try {
        await this.assertUnanswered(claimed._id);
      } catch (error) {
        await this.releaseTurn(turn);
        throw error;
      }
    }

    return turn;
  }

  // Only this turn's own stamp is cleared, never a later turn's.
  async releaseTurn({ sessionId, startedAt }: ClaimedTurn): Promise<void> {
    await this.sessionModel.updateOne(
      { _id: new Types.ObjectId(sessionId), turnStartedAt: startedAt },
      { $set: { turnStartedAt: null } },
    );
  }

  // A restart kills any running turn. Assumes a single server instance.
  async clearTurnLocks(): Promise<number> {
    const { modifiedCount } = await this.sessionModel.updateMany(
      { turnStartedAt: { $ne: null } },
      { $set: { turnStartedAt: null } },
    );

    return modifiedCount;
  }

  async loadTurnSession(
    turn: ClaimedTurn,
  ): Promise<{ session: ApplicationSessionDocument; messages: UIMessage[] }> {
    const session = await this.sessionModel.findById(turn.sessionId);
    if (!session) throw new NotFoundException('Session not found');

    return { session, messages: await this.history(session._id) };
  }

  // Appended once, never edited afterwards.
  async appendAssistantMessage(
    turn: ClaimedTurn,
    message: UIMessage,
    usage: MessageUsage,
  ): Promise<void> {
    const stored = new Message();
    stored.session = new Types.ObjectId(turn.sessionId);
    stored.uiId = message.id;
    stored.role = 'assistant';
    stored.parts = message.parts;
    stored.usage = usage;

    await new this.messageModel(stored).save();
  }

  // Saves the job on the session, so later turns and mock interviews have it.
  async fetchJob(
    { userId, sessionId }: SessionContext,
    url: string,
  ): Promise<JobFetchOutcome> {
    const outcome = await this.jobFetcherService.fetch(url);
    if (!outcome.ok) return outcome;

    const { job } = outcome;

    const sessionJob = new SessionJob();
    sessionJob.url = job.url;
    sessionJob.source = job.source;
    sessionJob.location = job.location;
    sessionJob.description = job.description;
    sessionJob.fetchedAt = new Date();

    await this.sessionModel.updateOne(
      { _id: new Types.ObjectId(sessionId), ...this.ownedBy(userId) },
      {
        $set: {
          job: sessionJob,
          ...(job.title && { title: job.title }),
          ...(job.company && { company: job.company }),
        },
      },
    );

    return outcome;
  }

  // Names the session after the role when nothing has named it yet.
  async saveFitScore(
    owner: SessionContext,
    input: FitScoreInput,
  ): Promise<SavedDocumentRef> {
    const fitScore = await this.documentsService.createFitScore(owner, input);
    const sessionId = new Types.ObjectId(owner.sessionId);

    await this.sessionModel.updateOne(
      { _id: sessionId, title: DEFAULT_SESSION_TITLE },
      { $set: { title: input.role } },
    );

    if (input.company) {
      await this.sessionModel.updateOne(
        { _id: sessionId, company: { $exists: false } },
        { $set: { company: input.company } },
      );
    }

    return toFitScoreRef(fitScore);
  }

  private async assertUnderMonthlyCap(userId: string): Promise<void> {
    const { start, resetsAt } = monthlyPeriod(new Date());
    const used = await this.countCreatedSince(userId, start);
    const limit = SESSION_LIMITS.sessionsPerMonth;

    if (used < limit) return;

    this.logger.warn('Monthly session limit reached', { userId, used, limit });

    const body: MonthlySessionLimitError = {
      code: 'monthly-session-limit',
      message: 'You have used every application for this month',
      used,
      limit,
      resetsAt: resetsAt.toISOString(),
    };

    throw new HttpException(
      { statusCode: HttpStatus.TOO_MANY_REQUESTS, ...body },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  // Archived sessions count: archiving never gives back a slot.
  private countCreatedSince(userId: string, start: Date): Promise<number> {
    return this.sessionModel.countDocuments({
      ...this.ownedBy(userId),
      createdAt: { $gte: start },
    });
  }

  // The claim matched nothing; the session says why. A lock released since
  // the claim still reads as a running turn, which the client can retry.
  private async throwTurnRefusal(
    userId: string,
    id: Types.ObjectId,
    countsMessage: boolean,
  ): Promise<never> {
    const session = await this.sessionModel.findOne({
      _id: id,
      ...this.ownedBy(userId),
    });

    if (!session) throw new NotFoundException('Session not found');

    if (session.archivedAt) {
      throw sessionError(
        HttpStatus.CONFLICT,
        'session-archived',
        'Unarchive this application to keep working on it',
      );
    }

    const atLimit =
      countsMessage &&
      session.userMessageCount >= SESSION_LIMITS.userMessagesPerSession;

    if (!atLimit) throw turnRunningError();

    this.logger.warn('Session message limit reached', {
      userId,
      sessionId: session.id,
    });

    throw sessionError(
      HttpStatus.TOO_MANY_REQUESTS,
      'session-message-limit',
      'This application has reached its message limit. Start a new application to keep going',
    );
  }

  private async assertUnanswered(sessionId: Types.ObjectId): Promise<void> {
    const last = await this.messageModel
      .findOne({ session: sessionId })
      .sort({ createdAt: -1, _id: -1 });

    if (last?.role !== 'user') {
      throw sessionError(
        HttpStatus.BAD_REQUEST,
        'nothing-to-answer',
        'Send a message to run a turn',
      );
    }
  }

  private async insertUserMessage(
    sessionId: Types.ObjectId,
    { id, text }: TurnMessageDto,
    transaction?: ClientSession,
  ): Promise<void> {
    const message = new Message();
    message.session = sessionId;
    message.uiId = id;
    message.role = 'user';
    message.parts = [{ type: 'text', text }];
    message.usage = null;

    await new this.messageModel(message).save({ session: transaction });
  }

  private ownedBy(userId: string): { user: Types.ObjectId } {
    return { user: new Types.ObjectId(userId) };
  }

  private async findOwned(
    userId: string,
    sessionId: string,
  ): Promise<ApplicationSessionDocument> {
    const id = parseObjectId(sessionId);

    const session =
      id &&
      (await this.sessionModel.findOne({
        _id: id,
        ...this.ownedBy(userId),
      }));

    if (!session) throw new NotFoundException('Session not found');

    return session;
  }

  // Oldest first, as stored.
  private async history(sessionId: Types.ObjectId): Promise<UIMessage[]> {
    const messages = await this.messageModel
      .find({ session: sessionId })
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    return messages.map(({ uiId, role, parts }) => ({
      id: uiId,
      role,
      parts,
    }));
  }
}
