import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import {
  DEFAULT_INTERVIEW_TITLE,
  INTERVIEW_FIRST_MESSAGE,
  SESSION_LIMITS,
  type ApplicationInterview,
  type InterviewState,
  type MonthlyInterviewLimitError,
  type SessionDetail,
  type SessionPage,
  type SessionSummary,
  type SetupInterviewInput,
} from '@quarry/contracts';
import { generateId } from 'ai';
import { ClientSession, Connection, Model, Types } from 'mongoose';
import type { SessionContext } from '../../common/common.types';
import { errorName } from '../../common/error-name';
import { DocumentsService } from '../../documents/documents.service';
import { ProfileService } from '../../profile/profile.service';
import { ResumeService } from '../../resume/resume.service';
import { profileSystemMessage } from '../agent/agent.utils';
import type { ListSessionsDto } from '../dto/list-sessions.dto';
import { AgentSession, AgentSessionDocument } from '../session.schema';
import {
  interviewEndedError,
  notAnApplicationError,
  sessionError,
} from '../session-errors';
import { SessionsService, toSessionParent } from '../sessions.service';
import { monthlyPeriod, toSessionSummary } from '../sessions.utils';
import { groupInterview, hasAnswer } from './interview-grouping';
import { InterviewFeedbackService } from './feedback/feedback.service';
import { feedbackFailureDetails } from './feedback/feedback.utils';
import { Interview, InterviewDocument } from './interview.schema';
import {
  ASK_QUESTION_TOOL,
  FEEDBACK_FAILED_MESSAGE,
  NOTHING_TO_REVIEW_MESSAGE,
  SETUP_INTERVIEW_TOOL,
} from './interviews.constants';
import type {
  AskOutcome,
  FinishOutcome,
  InterviewRead,
  InterviewProgress,
  ListedInterview,
  SetupOutcome,
} from './interviews.types';
import { numbered, progressFrom } from './interview-progress';
import {
  familyId,
  renderInterviewContext,
  toFeedback,
  toInterviewState,
  toInterviewSummary,
} from './interviews.utils';

// Logs carry ids, counts, durations and outcomes only, never user content.
@Injectable()
export class InterviewsService {
  private readonly logger = new Logger(InterviewsService.name);

  constructor(
    @InjectModel(AgentSession.name)
    private readonly sessionModel: Model<AgentSessionDocument>,
    @InjectModel(Interview.name)
    private readonly interviewModel: Model<InterviewDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly sessionsService: SessionsService,
    private readonly documentsService: DocumentsService,
    private readonly resumeService: ResumeService,
    private readonly profileService: ProfileService,
    private readonly feedbackService: InterviewFeedbackService,
  ) {}

  // Touching the application first makes two starts at once conflict, so the second
  // retries and finds the first's interview.
  async start(
    userId: string,
    parentSessionId: string,
  ): Promise<{ summary: SessionSummary; created: boolean }> {
    const parent = await this.sessionsService.findOwned(
      userId,
      parentSessionId,
    );

    this.assertCanInterview(parent);
    await this.sessionsService.assertPrimaryResumeReady(userId);

    const { session, created } = await this.connection.transaction(
      async (transaction) => {
        await this.sessionModel.updateOne(
          { _id: parent._id },
          { $currentDate: { updatedAt: true } },
          { session: transaction, timestamps: false },
        );

        const unfinished = await this.findUnfinished(parent._id, transaction);

        if (unfinished) return { session: unfinished, created: false };

        await this.assertUnderMonthlyCap(userId, transaction);

        const context = await this.renderContext(userId, parent);

        return {
          session: await this.create(userId, parent, context, transaction),
          created: true,
        };
      },
    );

    this.logger.log(created ? 'Interview created' : 'Interview resumed', {
      userId,
      parentSessionId: parent.id,
      interviewId: session.id,
    });

    return { summary: toSessionSummary(session, null), created };
  }

  async list(userId: string, query: ListSessionsDto): Promise<SessionPage> {
    const { sessions, nextCursor } = await this.sessionsService.page(
      userId,
      query,
      'interview',
    );

    const [interviews, parents] = await Promise.all([
      this.interviewModel
        .find({ session: { $in: sessions.map((session) => session._id) } })
        .select('session totalQuestions questions endedAt'),
      this.sessionModel
        .find({
          _id: {
            $in: sessions.flatMap((session) => session.parentSession ?? []),
          },
        })
        .select('title company'),
    ]);

    const interviewOf = new Map(
      interviews.map((interview) => [
        interview.session.toHexString(),
        interview,
      ]),
    );

    const parentOf = new Map(
      parents.map((parent) => [parent.id, toSessionParent(parent)]),
    );

    return {
      items: sessions.map((session) => {
        const interview = interviewOf.get(session.id);
        const parent =
          session.parentSession &&
          parentOf.get(session.parentSession.toHexString());

        return {
          ...toSessionSummary(session, null),
          ...(parent && { parentSession: parent }),
          ...(interview && { interview: toInterviewSummary(interview) }),
        };
      }),
      nextCursor,
    };
  }

  async withInterview(
    userId: string,
    detail: SessionDetail,
  ): Promise<SessionDetail> {
    const session = await this.sessionsService.findOwned(userId, detail.id);

    const [interview, parent] = await Promise.all([
      this.interviewModel.findOne({ session: session._id }),
      this.sessionModel.findById(session.parentSession).select('title company'),
    ]);

    return {
      ...detail,
      ...(parent && { parentSession: toSessionParent(parent) }),
      ...(interview && { interview: toInterviewState(interview) }),
    };
  }

  async listForApplication(
    userId: string,
    parentSessionId: string,
  ): Promise<ApplicationInterview[]> {
    const parent = await this.sessionsService.findOwned(
      userId,
      parentSessionId,
    );

    if (parent.kind !== 'application') throw notAnApplicationError();

    const sessions = await this.familySessions(parent._id);
    const endedAt = await this.endedAtOf(sessions);

    return sessions.map((session) => ({
      id: session.id,
      title: session.title,
      createdAt: session.createdAt.toISOString(),
      endedAt: endedAt.get(session.id)?.toISOString() ?? null,
    }));
  }

  async contextOf({ sessionId }: SessionContext): Promise<string> {
    const interview = await this.interviewModel
      .findOne({ session: new Types.ObjectId(sessionId) })
      .select('context');

    if (!interview) throw new Error('Interview record missing');

    return interview.context;
  }

  // Before the first question only. Names the session after the interview.
  async setup(
    context: SessionContext,
    { title, totalQuestions }: SetupInterviewInput,
    turn: InterviewProgress,
    abortSignal?: AbortSignal,
  ): Promise<SetupOutcome> {
    const { userId, sessionId } = context;
    const current = await this.currentProgress(context, turn);

    const reason = this.setupRefusal(current);

    if (reason) {
      this.logRefusal(context, SETUP_INTERVIEW_TOOL, reason);

      return { ok: false, reason };
    }

    turn.totalQuestions = totalQuestions;
    const session = new Types.ObjectId(sessionId);

    // A stopped turn has already been resynced; its writes would undo that.
    if (!abortSignal?.aborted) {
      await Promise.all([
        this.interviewModel.updateOne(
          { session, endedAt: { $exists: false } },
          { $set: { totalQuestions, questions: [] } },
        ),
        this.sessionModel.updateOne({ _id: session }, { $set: { title } }),
      ]);
    }

    this.logger.log('Interview set up', { userId, sessionId, totalQuestions });

    return { ok: true, totalQuestions };
  }

  // Counts stored questions plus this turn's, so a stopped turn's questions never take a number.
  async ask(
    context: SessionContext,
    question: string,
    turn: InterviewProgress,
    abortSignal?: AbortSignal,
  ): Promise<AskOutcome> {
    const { userId, sessionId } = context;
    const current = await this.currentProgress(context, turn);
    const reason = this.askRefusal(current);

    if (reason) {
      this.logRefusal(context, ASK_QUESTION_TOOL, reason);

      return { ok: false, reason };
    }

    const totalQuestions = current.totalQuestions ?? 0;
    turn.questions.push(question);
    const questions = [...current.questions, question];

    if (!abortSignal?.aborted) {
      await this.interviewModel.updateOne(
        { session: new Types.ObjectId(sessionId), endedAt: { $exists: false } },
        { $set: { totalQuestions, questions: numbered(questions) } },
      );
    }

    this.logger.log('Interview question asked', {
      userId,
      sessionId,
      number: questions.length,
      totalQuestions,
    });

    return { ok: true, number: questions.length, totalQuestions };
  }

  // After an unsaved turn: back to what the stored messages say, dropping its set-up and questions.
  async resync({ sessionId }: SessionContext): Promise<void> {
    const session = new Types.ObjectId(sessionId);
    const { totalQuestions, questions } = progressFrom(
      await this.sessionsService.history(session),
    );

    if (totalQuestions !== undefined) {
      await this.interviewModel.updateOne(
        { session, endedAt: { $exists: false } },
        { $set: { totalQuestions, questions: numbered(questions) } },
      );

      return;
    }

    // Never set up: the dropped set-up's title goes too.
    await Promise.all([
      this.interviewModel.updateOne(
        { session, endedAt: { $exists: false } },
        { $set: { questions: [] }, $unset: { totalQuestions: 1 } },
      ),
      this.sessionModel.updateOne(
        { _id: session },
        { $set: { title: DEFAULT_INTERVIEW_TITLE } },
      ),
    ]);
  }

  private async currentProgress(
    { sessionId }: SessionContext,
    turn: InterviewProgress,
  ): Promise<InterviewProgress & { ended: boolean }> {
    const session = new Types.ObjectId(sessionId);
    const [interview, messages] = await Promise.all([
      this.interviewModel.findOne({ session }).select('endedAt'),
      this.sessionsService.history(session),
    ]);
    const stored = progressFrom(messages);

    return {
      ended: Boolean(interview?.endedAt),
      totalQuestions: turn.totalQuestions ?? stored.totalQuestions,
      questions: [...stored.questions, ...turn.questions],
    };
  }

  private setupRefusal(
    current: InterviewProgress & { ended: boolean },
  ): Extract<SetupOutcome, { ok: false }>['reason'] | null {
    if (current.ended) return 'interview-ended';
    if (current.questions.length > 0) return 'already-started';

    return null;
  }

  private askRefusal(
    current: InterviewProgress & { ended: boolean },
  ): Extract<AskOutcome, { ok: false }>['reason'] | null {
    if (current.ended) return 'interview-ended';
    if (current.totalQuestions === undefined) return 'not-set-up';
    if (current.questions.length >= current.totalQuestions) {
      return 'last-question-asked';
    }

    return null;
  }

  private logRefusal(
    { userId, sessionId }: SessionContext,
    tool: string,
    reason: string,
  ): void {
    this.logger.warn('Interview tool refused', {
      userId,
      sessionId,
      tool,
      reason,
    });
  }

  // The End button: takes the turn lock, so it never runs beside a turn.
  async end(userId: string, sessionId: string): Promise<InterviewState> {
    const session = await this.sessionsService.findOwned(userId, sessionId);

    if (session.kind !== 'interview') {
      throw sessionError(
        HttpStatus.CONFLICT,
        'not-an-interview',
        'This is not an interview',
      );
    }

    // Ended first, so End on an ended interview says so even mid-turn.
    if (
      await this.interviewModel.exists({
        session: session._id,
        endedAt: { $exists: true },
      })
    ) {
      throw interviewEndedError();
    }

    const lock = await this.sessionsService.claimLock(session._id);

    try {
      const outcome = await this.finish({ userId, sessionId: session.id });

      if (outcome.ok) return outcome.interview;

      if (outcome.reason === 'interview-ended') throw interviewEndedError();

      if (outcome.reason === 'nothing-to-review') {
        throw sessionError(
          HttpStatus.CONFLICT,
          'nothing-to-review',
          NOTHING_TO_REVIEW_MESSAGE,
        );
      }

      throw sessionError(
        HttpStatus.BAD_GATEWAY,
        'feedback-failed',
        FEEDBACK_FAILED_MESSAGE,
      );
    } finally {
      await this.sessionsService.releaseTurn(lock);
    }
  }

  // Saves Q&A, feedback and `endedAt` together, or nothing. The caller holds the
  // turn lock; a stop (`abortSignal`) cancels the feedback call.
  async finish(
    context: SessionContext,
    abortSignal?: AbortSignal,
  ): Promise<FinishOutcome> {
    const { userId, sessionId } = context;
    const session = new Types.ObjectId(sessionId);
    const startedAt = Date.now();

    const interview = await this.interviewModel.findOne({ session });
    if (!interview) throw new Error('Interview record missing');
    if (interview.endedAt) return { ok: false, reason: 'interview-ended' };

    this.logger.log('Interview finish started', { userId, sessionId });

    try {
      const questionsAndAnswers = groupInterview(
        await this.sessionsService.history(session),
      );

      if (!hasAnswer(questionsAndAnswers)) {
        this.logger.warn('Interview finish refused', {
          userId,
          sessionId,
          reason: 'nothing-to-review',
        });

        return { ok: false, reason: 'nothing-to-review' };
      }

      const { feedback, usage } = await this.feedbackService.write({
        context: interview.context,
        profile: await this.profileMessage(userId),
        questionsAndAnswers,
        abortSignal,
      });

      if (abortSignal?.aborted) return { ok: false, reason: 'feedback-failed' };

      const ended = await this.interviewModel.findOneAndUpdate(
        { session, endedAt: { $exists: false } },
        { $set: { questionsAndAnswers, feedback, endedAt: new Date() } },
        { returnDocument: 'after' },
      );

      if (!ended) return { ok: false, reason: 'interview-ended' };

      this.logger.log('Interview finished', {
        userId,
        sessionId,
        questionCount: questionsAndAnswers.length,
        wentWell: feedback.wentWell.length,
        toImprove: feedback.toImprove.length,
        strongerAnswers: feedback.strongerAnswers.length,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        durationMs: Date.now() - startedAt,
      });

      return { ok: true, interview: toInterviewState(ended) };
    } catch (error) {
      this.logger.error('Interview finish failed', {
        userId,
        sessionId,
        error: errorName(error),
        ...feedbackFailureDetails(error),
        durationMs: Date.now() - startedAt,
      });

      return { ok: false, reason: 'feedback-failed' };
    }
  }

  // Every interview for the caller's job; `current` marks the caller's own.
  async listFamily({
    userId,
    sessionId,
  }: SessionContext): Promise<ListedInterview[]> {
    const caller = await this.sessionsService.findOwned(userId, sessionId);
    const sessions = await this.familySessions(familyId(caller));
    const endedAt = await this.endedAtOf(sessions);

    return sessions.map((session) => ({
      sessionId: session.id,
      title: session.title,
      date: session.createdAt.toISOString(),
      finished: endedAt.has(session.id),
      ...(session.id === caller.id && { current: true }),
    }));
  }

  // Null when the interview isn't in the caller's family.
  async readInFamily(
    { userId, sessionId }: SessionContext,
    interviewId: string,
  ): Promise<InterviewRead | null> {
    const caller = await this.sessionsService.findOwned(userId, sessionId);

    if (!Types.ObjectId.isValid(interviewId)) return null;

    const target = await this.sessionModel
      .findOne({
        _id: new Types.ObjectId(interviewId),
        user: new Types.ObjectId(userId),
        kind: 'interview',
        parentSession: familyId(caller),
      })
      .select('title createdAt');

    const interview =
      target && (await this.interviewModel.findOne({ session: target._id }));

    if (!target || !interview) return null;

    const base = {
      title: target.title,
      startedAt: target.createdAt.toISOString(),
    };

    if (!interview.endedAt || !interview.feedback) {
      return {
        ...base,
        finished: false,
        questions: interview.questions.map(({ question }) => question),
      };
    }

    return {
      ...base,
      finished: true,
      endedAt: interview.endedAt.toISOString(),
      questionsAndAnswers: interview.questionsAndAnswers.map(
        ({ question, answer, followUps }) => ({
          question,
          answer,
          followUps: followUps.map((followUp) => ({
            question: followUp.question,
            answer: followUp.answer,
          })),
        }),
      ),
      feedback: interview.feedback ? toFeedback(interview.feedback) : null,
    };
  }

  private assertCanInterview(parent: AgentSessionDocument): void {
    if (parent.kind !== 'application') throw notAnApplicationError();

    if (parent.archivedAt) {
      throw sessionError(
        HttpStatus.CONFLICT,
        'application-archived',
        'Unarchive this application to practise an interview for it',
      );
    }

    if (!parent.job?.description) {
      throw sessionError(
        HttpStatus.CONFLICT,
        'job-description-missing',
        'This application has no job description to practise an interview for',
      );
    }
  }

  private async findUnfinished(
    parentSessionId: Types.ObjectId,
    transaction: ClientSession,
  ): Promise<AgentSessionDocument | null> {
    const sessions = await this.familySessions(parentSessionId, transaction);
    const endedAt = await this.endedAtOf(sessions, transaction);

    return sessions.find((session) => !endedAt.has(session.id)) ?? null;
  }

  private familySessions(
    parentSessionId: Types.ObjectId,
    transaction?: ClientSession,
  ): Promise<AgentSessionDocument[]> {
    return this.sessionModel
      .find({ kind: 'interview', parentSession: parentSessionId })
      .sort({ createdAt: -1, _id: -1 })
      .session(transaction ?? null);
  }

  private async endedAtOf(
    sessions: AgentSessionDocument[],
    transaction?: ClientSession,
  ): Promise<Map<string, Date>> {
    const ended = await this.interviewModel
      .find({
        session: { $in: sessions.map((session) => session._id) },
        endedAt: { $exists: true },
      })
      .select('session endedAt')
      .session(transaction ?? null);

    return new Map(
      ended.flatMap(({ session, endedAt }) =>
        endedAt ? [[session.toHexString(), endedAt] as const] : [],
      ),
    );
  }

  private async assertUnderMonthlyCap(
    userId: string,
    transaction: ClientSession,
  ): Promise<void> {
    const { start, resetsAt } = monthlyPeriod(new Date());
    const used = await this.sessionsService.countCreatedSince(
      userId,
      start,
      'interview',
      transaction,
    );
    const limit = SESSION_LIMITS.interviewsPerMonth;

    if (used < limit) return;

    this.logger.warn('Monthly interview limit reached', {
      userId,
      used,
      limit,
    });

    const body: MonthlyInterviewLimitError = {
      code: 'monthly-interview-limit',
      message: 'You have used every mock interview for this month',
      used,
      limit,
      resetsAt: resetsAt.toISOString(),
    };

    throw new HttpException(
      { statusCode: HttpStatus.TOO_MANY_REQUESTS, ...body },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private async renderContext(
    userId: string,
    parent: AgentSessionDocument,
  ): Promise<string> {
    const owner = { userId, sessionId: parent.id };

    const [resume, coverLetter, fitScore] = await Promise.all([
      this.resumeService.findLatestContent(owner),
      this.documentsService.latestCoverLetter(owner),
      this.documentsService.latestFitScore(owner),
    ]);

    return renderInterviewContext({
      jobDescription: parent.job?.description ?? '',
      resume,
      coverLetter,
      fitScore,
    });
  }

  private async create(
    userId: string,
    parent: AgentSessionDocument,
    context: string,
    transaction: ClientSession,
  ): Promise<AgentSessionDocument> {
    const session = new AgentSession();
    session.user = new Types.ObjectId(userId);
    session.kind = 'interview';
    session.parentSession = parent._id;
    session.title = DEFAULT_INTERVIEW_TITLE;
    session.company = parent.company;
    session.userMessageCount = 1;
    session.turnStartedAt = null;
    session.archivedAt = null;

    const saved = await new this.sessionModel(session).save({
      session: transaction,
    });

    await this.sessionsService.insertUserMessage(
      saved._id,
      { id: generateId(), text: INTERVIEW_FIRST_MESSAGE },
      transaction,
    );

    const interview = new Interview();
    interview.session = saved._id;
    interview.user = saved.user;
    interview.context = context;
    interview.questions = [];
    interview.questionsAndAnswers = [];

    await new this.interviewModel(interview).save({ session: transaction });

    return saved;
  }

  private async profileMessage(userId: string): Promise<string> {
    const [profile, resume] = await Promise.all([
      this.profileService.findByUserId(userId),
      this.resumeService.findPrimaryContent(userId),
    ]);

    if (!profile || !resume) {
      throw new Error('Profile or parsed primary resume missing');
    }

    // Feedback is about the answers, so it carries no unreviewed-resume note.
    return profileSystemMessage(profile, { ...resume, reviewed: true });
  }
}
