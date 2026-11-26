import { INestApplication } from '@nestjs/common';
import {
  INTERVIEW_FIRST_MESSAGE,
  SESSION_LIMITS,
  type InterviewFeedback,
} from '@quarry/contracts';
import { Types } from 'mongoose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createTestApp } from '../../../../../test/integration/create-test-app';
import { getTestDatabase } from '../../../../../test/integration/database';
import {
  fakeAnthropicApi,
  type AnthropicReply,
  type StreamedBlock,
} from '../../../../../test/integration/fake-anthropic-api';
import {
  deferred,
  findMessages,
  findSession,
  fitScoreInput,
  seedOnboarded,
  seedSessions,
  setSession,
} from '../../../../../test/integration/session-fixtures';
import {
  signUp,
  TEST_ORIGIN,
} from '../../../../lib/__integration__/sign-up.fixture';
import { INTERVIEW_SYSTEM_PROMPT } from '../interviews.constants';

const JOB_DESCRIPTION = 'Staff Platform Engineer at Globex. Go, Kafka, SRE.';

const feedback: InterviewFeedback = {
  wentWell: ['Clear structure.', 'Concrete numbers.'],
  toImprove: ['Shorter intros.', 'Name the trade-off.'],
  strongerAnswers: [
    {
      question: 'Tell me about yourself.',
      said: 'I build payments systems.',
      stronger: 'I built the settlement service at Paystack.',
    },
  ],
  additionalNotes: 'Yes, that answer was on the right track.',
};

const toolUse = (name: string, input: object, id = `toolu_${name}`) =>
  ({ type: 'tool_use', id, name, input }) as const;

const toolStep = (...blocks: StreamedBlock[]): AnthropicReply => ({
  kind: 'stream',
  blocks,
  stopReason: 'tool_use',
});

const textReply = (text: string): AnthropicReply => ({
  kind: 'stream',
  blocks: [{ type: 'text', text }],
});

const interviewFeedbackReply: AnthropicReply = {
  kind: 'object',
  value: feedback,
};

const findInterview = (sessionId: string) =>
  getTestDatabase()
    .collection('interviews')
    .findOne({ session: new Types.ObjectId(sessionId) });

// A tool's stored output in the session's latest assistant message.
const toolOutput = async (sessionId: string, tool: string) => {
  const messages = await findMessages(sessionId);
  const part = messages
    .flatMap(({ parts }) => parts as { type: string; output?: unknown }[])
    .findLast(({ type }) => type === `tool-${tool}`);

  return part?.output;
};

describe('Interviews (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const api = (
    method: 'get' | 'post' | 'patch',
    path: string,
    cookie: string[],
  ) =>
    request(app.getHttpServer())
      [method](`/api${path}`)
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', cookie);

  const onboardedUser = async (email?: string) => {
    const user = await signUp(app, email ? { email } : {});
    await seedOnboarded(user.userId);

    return user;
  };

  const startApplication = async (cookie: string[]) => {
    const created = await api('post', '/sessions', cookie).send({
      jobDescription: JOB_DESCRIPTION,
    });

    expect(created.status).toBe(201);

    return created.body.id as string;
  };

  const startInterview = async (cookie: string[], applicationId: string) => {
    const started = await api(
      'post',
      `/sessions/${applicationId}/interviews`,
      cookie,
    );

    expect(started.status).toBe(201);

    return started.body.id as string;
  };

  // Runs one turn: the first answers the stored first message.
  const turn = (cookie: string[], id: string, text?: string) =>
    api('post', `/sessions/${id}/turns`, cookie).send(
      text ? { message: { id: new Types.ObjectId().toHexString(), text } } : {},
    );

  // An interview set up with `total` questions and its first question asked.
  const setUpInterview = async (
    cookie: string[],
    interviewId: string,
    total = 4,
  ) => {
    fakeAnthropicApi.reply(
      toolStep(
        toolUse('setup_interview', {
          title: 'Technical round',
          totalQuestions: total,
        }),
        toolUse('ask_interview_question', {
          question: 'Tell me about yourself.',
        }),
      ),
    );

    expect((await turn(cookie, interviewId)).status).toBe(200);
  };

  // The user answers, and Wren asks `next` if given.
  const answer = async (
    cookie: string[],
    interviewId: string,
    text: string,
    next?: string,
  ) => {
    fakeAnthropicApi.reply(
      ...(next
        ? [toolStep(toolUse('ask_interview_question', { question: next }))]
        : [textReply('How did you find it?')]),
    );

    expect((await turn(cookie, interviewId, text)).status).toBe(200);
  };

  describe('starting', () => {
    it('creates an interview session, its first message and its record with the context', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      await setSession(applicationId, { company: 'Globex' });

      const started = await api(
        'post',
        `/sessions/${applicationId}/interviews`,
        cookie,
      );

      expect(started.status).toBe(201);
      expect(started.body).toEqual(
        expect.objectContaining({
          kind: 'interview',
          title: 'New interview',
          company: 'Globex',
        }),
      );

      const id = started.body.id as string;
      const [session, messages, interview] = await Promise.all([
        findSession(id),
        findMessages(id),
        findInterview(id),
      ]);

      expect(session?.parentSession?.toHexString()).toBe(applicationId);
      expect(session?.userMessageCount).toBe(1);
      expect(messages.map(({ role, parts }) => ({ role, parts }))).toEqual([
        {
          role: 'user',
          parts: [{ type: 'text', text: INTERVIEW_FIRST_MESSAGE }],
        },
      ]);
      expect(interview?.context).toContain(JOB_DESCRIPTION);
      expect(interview?.context).toContain('"name":"Ada Obi"');
    });

    it("renders the application's latest documents into the context", async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);

      fakeAnthropicApi.reply(
        toolStep(toolUse('save_fit_score', fitScoreInput)),
        textReply('Scored.'),
      );
      await turn(cookie, applicationId);

      const id = await startInterview(cookie, applicationId);

      expect((await findInterview(id))?.context).toContain('<fit-report>');
    });

    it('returns the unfinished interview on a second press without counting it again', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);

      const again = await api(
        'post',
        `/sessions/${applicationId}/interviews`,
        cookie,
      );

      expect(again.status).toBe(200);
      expect(again.body.id).toBe(id);

      const usage = await api('get', '/usage', cookie);
      expect(usage.body.interviews.used).toBe(1);
    });

    it('refuses an interview, an archived application and one with no job description', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const interviewId = await startInterview(cookie, applicationId);

      const fromInterview = await api(
        'post',
        `/sessions/${interviewId}/interviews`,
        cookie,
      );
      expect(fromInterview.status).toBe(409);
      expect(fromInterview.body.code).toBe('not-an-application');

      const linked = await api('post', '/sessions', cookie).send({
        jobUrl: 'https://boards.greenhouse.io/globex/jobs/1',
      });
      const noDescription = await api(
        'post',
        `/sessions/${linked.body.id}/interviews`,
        cookie,
      );
      expect(noDescription.status).toBe(409);
      expect(noDescription.body.code).toBe('job-description-missing');

      await setSession(applicationId, { archivedAt: new Date() });
      const archived = await api(
        'post',
        `/sessions/${applicationId}/interviews`,
        cookie,
      );
      expect(archived.status).toBe(409);
      expect(archived.body.code).toBe('application-archived');
    });

    it('opens one interview when two starts arrive at once', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);

      const [first, second] = await Promise.all([
        api('post', `/sessions/${applicationId}/interviews`, cookie),
        api('post', `/sessions/${applicationId}/interviews`, cookie),
      ]);

      expect([first.status, second.status].sort()).toEqual([200, 201]);
      expect(first.body.id).toBe(second.body.id);

      const usage = await api('get', '/usage', cookie);
      expect(usage.body.interviews.used).toBe(1);
    });

    it('refuses while the primary resume is not ready', async () => {
      const { cookie, userId } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      await getTestDatabase()
        .collection('resumes')
        .updateOne(
          { user: new Types.ObjectId(userId), kind: 'primary' },
          { $set: { parseStatus: 'failed' } },
        );

      const refused = await api(
        'post',
        `/sessions/${applicationId}/interviews`,
        cookie,
      );

      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('primary-resume-not-ready');
    });

    it("404s another user's application", async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const other = await onboardedUser('obi@example.com');

      const started = await api(
        'post',
        `/sessions/${applicationId}/interviews`,
        other.cookie,
      );

      expect(started.status).toBe(404);
    });

    it('allows 10 interviews a month and refuses the 11th with a 429', async () => {
      const { cookie, userId } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const now = new Date();

      await seedSessions(
        userId,
        Array.from(
          { length: SESSION_LIMITS.interviewsPerMonth - 1 },
          () => now,
        ),
        { kind: 'interview', parentSession: new Types.ObjectId() },
      );

      await startInterview(cookie, applicationId);
      await getTestDatabase()
        .collection('interviews')
        .updateMany({}, { $set: { endedAt: now } });

      const refused = await api(
        'post',
        `/sessions/${applicationId}/interviews`,
        cookie,
      );

      expect(refused.status).toBe(429);
      expect(refused.body).toEqual(
        expect.objectContaining({
          code: 'monthly-interview-limit',
          used: 10,
          limit: 10,
        }),
      );

      const usage = await api('get', '/usage', cookie);
      expect(usage.body.interviews).toEqual(
        expect.objectContaining({ used: 10, limit: 10 }),
      );
      expect(usage.body.sessions.used).toBe(1);
    });
  });

  describe('lists', () => {
    it('keeps interviews out of the application list and the application cap', async () => {
      const { cookie, userId } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      await startInterview(cookie, applicationId);
      await seedSessions(
        userId,
        Array.from(
          { length: SESSION_LIMITS.sessionsPerMonth - 1 },
          () => new Date(),
        ),
      );

      const applications = await api('get', '/sessions', cookie);
      expect(
        applications.body.items.every(
          ({ kind }: { kind: string }) => kind === 'application',
        ),
      ).toBe(true);

      const tenth = await api('post', '/sessions', cookie).send({
        jobDescription: JOB_DESCRIPTION,
      });
      expect(tenth.status).toBe(429);
    });

    it('lists interviews with their application and progress', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      await setSession(applicationId, {
        title: 'Staff Platform Engineer',
        company: 'Globex',
      });
      const id = await startInterview(cookie, applicationId);
      await setUpInterview(cookie, id);

      const listed = await api('get', '/sessions?kind=interview', cookie);

      expect(listed.body.items).toEqual([
        expect.objectContaining({
          id,
          kind: 'interview',
          title: 'Technical round',
          parentSession: {
            id: applicationId,
            title: 'Staff Platform Engineer',
            company: 'Globex',
          },
          interview: { totalQuestions: 4, questionCount: 1 },
        }),
      ]);
    });

    it("lists an application's interviews for its tab, newest first", async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const first = await startInterview(cookie, applicationId);
      const endedAt = new Date();
      await getTestDatabase()
        .collection('interviews')
        .updateOne(
          { session: new Types.ObjectId(first) },
          { $set: { endedAt } },
        );
      const second = await startInterview(cookie, applicationId);

      const listed = await api(
        'get',
        `/sessions/${applicationId}/interviews`,
        cookie,
      );

      expect(listed.body).toEqual([
        {
          id: second,
          title: 'New interview',
          createdAt: expect.any(String),
          endedAt: null,
        },
        {
          id: first,
          title: 'New interview',
          createdAt: expect.any(String),
          endedAt: endedAt.toISOString(),
        },
      ]);

      const fromInterview = await api(
        'get',
        `/sessions/${first}/interviews`,
        cookie,
      );
      expect(fromInterview.status).toBe(409);
      expect(fromInterview.body.code).toBe('not-an-application');
    });

    it('returns the interview state and its application on the detail', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);

      const detail = await api('get', `/sessions/${id}`, cookie);

      expect(detail.body).toEqual(
        expect.objectContaining({
          kind: 'interview',
          parentSession: {
            id: applicationId,
            title: 'New application',
            company: null,
          },
          interview: { questionCount: 0 },
        }),
      );
    });
  });

  describe('turns', () => {
    it('sends the interview prompt, the stored context and the interview tools', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);
      fakeAnthropicApi.reply(textReply('Hi! What kind of interview is this?'));

      await turn(cookie, id);

      const [sent] = fakeAnthropicApi.requests;
      const interview = await findInterview(id);

      expect(sent.system?.map(({ text }) => text)).toEqual([
        INTERVIEW_SYSTEM_PROMPT,
        interview?.context,
      ]);
      expect(sent.tools?.map(({ name }) => name).sort()).toEqual([
        'ask_interview_question',
        'end_interview',
        'get_interview',
        'list_interviews',
        'setup_interview',
      ]);
    });

    it('sets the interview up once and names the session', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);

      await setUpInterview(cookie, id, 5);

      expect((await findSession(id))?.title).toBe('Technical round');
      expect(await findInterview(id)).toEqual(
        expect.objectContaining({
          totalQuestions: 5,
          questions: [{ number: 1, question: 'Tell me about yourself.' }],
        }),
      );

      fakeAnthropicApi.reply(
        toolStep(
          toolUse('setup_interview', { title: 'Again', totalQuestions: 8 }),
        ),
        textReply(''),
      );
      await turn(cookie, id, 'I build payments systems.');

      expect(await toolOutput(id, 'setup_interview')).toEqual(
        expect.objectContaining({ ok: false, reason: 'already-started' }),
      );
      expect((await findInterview(id))?.totalQuestions).toBe(5);
    });

    it('refuses a question before set-up', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);

      fakeAnthropicApi.reply(
        toolStep(toolUse('ask_interview_question', { question: 'Why us?' })),
        textReply(''),
      );
      await turn(cookie, id);

      expect(await toolOutput(id, 'ask_interview_question')).toEqual(
        expect.objectContaining({ ok: false, reason: 'not-set-up' }),
      );
      expect((await findInterview(id))?.questions).toEqual([]);
    });

    it("drops a stopped turn's set-up, so the retry sets up afresh and starts at question 1", async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);
      const [first] = await findMessages(id);
      const never = deferred();

      fakeAnthropicApi.reply(
        toolStep(
          toolUse('setup_interview', {
            title: 'Technical round',
            totalQuestions: 4,
          }),
        ),
        {
          kind: 'stream',
          blocks: [
            { type: 'text', text: 'Take ' },
            { type: 'text', text: 'your time.' },
          ],
          pauseAfterFirstBlock: never.promise,
        },
      );

      const running = turn(cookie, id).then((response) => response);
      await vi.waitFor(
        async () => expect(fakeAnthropicApi.requests).toHaveLength(2),
        { timeout: 5_000, interval: 20 },
      );

      await api('post', `/sessions/${id}/turns/stop`, cookie)
        .send({ messageId: first.uiId })
        .expect(204);
      await running;

      expect(await findInterview(id)).toEqual(
        expect.objectContaining({ questions: [] }),
      );
      expect((await findInterview(id))?.totalQuestions).toBeUndefined();
      expect((await findSession(id))?.title).toBe('New interview');

      await setUpInterview(cookie, id);

      expect(await toolOutput(id, 'ask_interview_question')).toEqual({
        ok: true,
        number: 1,
        totalQuestions: 4,
      });
      expect((await findInterview(id))?.questions).toEqual([
        { number: 1, question: 'Tell me about yourself.' },
      ]);
    });

    it('stores a question starting with $ as written', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);
      await setUpInterview(cookie, id);

      await answer(
        cookie,
        id,
        'One.',
        '$150k is the top of the band. Does that work?',
      );

      expect((await findInterview(id))?.questions[1]).toEqual({
        number: 2,
        question: '$150k is the top of the band. Does that work?',
      });
    });

    it('ends the turn once a question is asked, with nothing written after it', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);
      await setUpInterview(cookie, id);
      const requestsBefore = fakeAnthropicApi.requests.length;

      fakeAnthropicApi.reply(
        toolStep(toolUse('ask_interview_question', { question: 'Why us?' })),
        textReply('Question 2 is up.'),
      );
      await turn(cookie, id, 'One.');

      expect(fakeAnthropicApi.requests).toHaveLength(requestsBefore + 1);
      const reply = (await findMessages(id)).at(-1);
      expect(JSON.stringify(reply?.parts)).not.toContain('Question 2 is up.');
    });

    it('numbers questions on the server and refuses one past the total', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);
      await setUpInterview(cookie, id, 4);

      fakeAnthropicApi.reply(
        toolStep(
          toolUse('ask_interview_question', { question: 'Q2?' }, 'toolu_2'),
          toolUse('ask_interview_question', { question: 'Q3?' }, 'toolu_3'),
          toolUse('ask_interview_question', { question: 'Q4?' }, 'toolu_4'),
          toolUse('ask_interview_question', { question: 'Q5?' }, 'toolu_5'),
        ),
      );
      await turn(cookie, id, 'An answer.');

      const interview = await findInterview(id);
      expect(
        interview?.questions.map(({ number }: { number: number }) => number),
      ).toEqual([1, 2, 3, 4]);
      expect(await toolOutput(id, 'ask_interview_question')).toEqual(
        expect.objectContaining({ ok: false, reason: 'last-question-asked' }),
      );
    });
  });

  describe('ending', () => {
    it('saves the grouped answers, the feedback and endedAt together from the End button', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);
      await setUpInterview(cookie, id);
      await answer(cookie, id, 'I build payments systems.');
      await answer(cookie, id, 'Tracing.', 'Why Globex?');
      fakeAnthropicApi.reply(interviewFeedbackReply);

      const ended = await api('post', `/sessions/${id}/interview/end`, cookie);

      expect(ended.status).toBe(200);
      expect(ended.body).toEqual({
        totalQuestions: 4,
        questionCount: 2,
        endedAt: expect.any(String),
        feedback,
      });

      const [feedbackRequest] = fakeAnthropicApi.requests.slice(-1);
      const sent = JSON.stringify(feedbackRequest.messages);
      expect(sent).toContain(JOB_DESCRIPTION);
      expect(sent).toContain('targetRoles');
      expect(sent).toContain('Tell me about yourself.');
      expect(sent).not.toContain('Why Globex?');

      const interview = await findInterview(id);
      expect(interview?.questionsAndAnswers).toEqual([
        {
          question: 'Tell me about yourself.',
          answer: 'I build payments systems.',
          followUps: [{ question: 'How did you find it?', answer: 'Tracing.' }],
        },
        { question: 'Why Globex?', answer: '', followUps: [] },
      ]);
      expect((await findSession(id))?.turnStartedAt).toBeNull();

      const detail = await api('get', `/sessions/${id}`, cookie);
      expect(detail.body.interview.feedback).toEqual(feedback);
    });

    it('refuses turns once the interview has ended', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);
      await setUpInterview(cookie, id);
      await answer(cookie, id, 'I build payments systems.');
      fakeAnthropicApi.reply(interviewFeedbackReply);
      await api('post', `/sessions/${id}/interview/end`, cookie).expect(200);

      const refused = await turn(cookie, id, 'One more thing.');

      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('interview-ended');
      expect((await findSession(id))?.userMessageCount).toBe(2);

      const again = await api('post', `/sessions/${id}/interview/end`, cookie);
      expect(again.status).toBe(409);
      expect(again.body.code).toBe('interview-ended');
    });

    it('asks again once when the feedback does not fit the schema', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);
      await setUpInterview(cookie, id);
      await answer(cookie, id, 'I build payments systems.');
      fakeAnthropicApi.reply(
        { kind: 'object', value: { ...feedback, wentWell: [] } },
        interviewFeedbackReply,
      );

      const ended = await api('post', `/sessions/${id}/interview/end`, cookie);

      expect(ended.status).toBe(200);
      expect(ended.body.feedback).toEqual(feedback);
    });

    it('keeps the interview open when the feedback fails', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);
      await setUpInterview(cookie, id);
      await answer(cookie, id, 'I build payments systems.');
      fakeAnthropicApi.reply({ kind: 'refusal' });

      const failed = await api('post', `/sessions/${id}/interview/end`, cookie);

      expect(failed.status).toBe(502);
      expect(failed.body.code).toBe('feedback-failed');

      const interview = await findInterview(id);
      expect(interview?.endedAt).toBeUndefined();
      expect(interview?.feedback).toBeUndefined();
      expect(interview?.questionsAndAnswers).toEqual([]);
      expect((await findSession(id))?.turnStartedAt).toBeNull();
    });

    it('refuses to end before any question is answered', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);
      await setUpInterview(cookie, id);

      const refused = await api(
        'post',
        `/sessions/${id}/interview/end`,
        cookie,
      );

      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('nothing-to-review');
      expect((await findInterview(id))?.endedAt).toBeUndefined();
    });

    it('refuses to end an application or while a turn runs', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);

      const application = await api(
        'post',
        `/sessions/${applicationId}/interview/end`,
        cookie,
      );
      expect(application.status).toBe(409);
      expect(application.body.code).toBe('not-an-interview');

      const gate = deferred();
      fakeAnthropicApi.reply({
        kind: 'stream',
        blocks: [
          { type: 'text', text: 'Hi! ' },
          { type: 'text', text: 'What kind of interview is this?' },
        ],
        pauseAfterFirstBlock: gate.promise,
      });

      const running = turn(cookie, id).then((response) => response);
      await vi.waitFor(
        async () => expect((await findSession(id))?.turnStartedAt).toBeTruthy(),
        { timeout: 5_000, interval: 20 },
      );

      const refused = await api(
        'post',
        `/sessions/${id}/interview/end`,
        cookie,
      );
      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('turn-running');

      gate.resolve();
      expect((await running).status).toBe(200);
    });

    it('ends from end_interview within a turn', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const id = await startInterview(cookie, applicationId);
      await setUpInterview(cookie, id);

      fakeAnthropicApi.reply(
        toolStep(toolUse('end_interview', {})),
        interviewFeedbackReply,
        textReply('Thanks, that is the interview.'),
      );
      expect((await turn(cookie, id, 'I build payments systems.')).status).toBe(
        200,
      );

      expect(await toolOutput(id, 'end_interview')).toEqual({
        ok: true,
        ended: true,
      });

      const interview = await findInterview(id);
      expect(interview?.endedAt).toBeInstanceOf(Date);
      expect(interview?.feedback).toEqual(feedback);
      expect(interview?.questionsAndAnswers).toEqual([
        {
          question: 'Tell me about yourself.',
          answer: 'I build payments systems.',
          followUps: [],
        },
      ]);
    });
  });

  describe('reading interviews', () => {
    const finishedInterview = async (
      cookie: string[],
      applicationId: string,
    ) => {
      const id = await startInterview(cookie, applicationId);
      await setUpInterview(cookie, id);
      await answer(cookie, id, 'I build payments systems.');
      fakeAnthropicApi.reply(interviewFeedbackReply);
      await api('post', `/sessions/${id}/interview/end`, cookie).expect(200);

      return id;
    };

    it('lets the application read its interviews', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const interviewId = await finishedInterview(cookie, applicationId);
      fakeAnthropicApi.reset();

      fakeAnthropicApi.reply(
        toolStep(
          toolUse('list_interviews', {}),
          toolUse('get_interview', { sessionId: interviewId }),
        ),
        textReply('It went well.'),
      );
      await turn(cookie, applicationId);

      expect(await toolOutput(applicationId, 'list_interviews')).toEqual({
        ok: true,
        interviews: [
          {
            sessionId: interviewId,
            title: 'Technical round',
            date: expect.any(String),
            finished: true,
          },
        ],
      });

      expect(await toolOutput(applicationId, 'get_interview')).toEqual({
        ok: true,
        interview: expect.objectContaining({
          finished: true,
          feedback,
          questionsAndAnswers: [
            expect.objectContaining({ answer: 'I build payments systems.' }),
          ],
        }),
      });
    });

    it('lets a later interview read its earlier siblings', async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const first = await finishedInterview(cookie, applicationId);
      const second = await startInterview(cookie, applicationId);

      fakeAnthropicApi.reply(
        toolStep(toolUse('get_interview', { sessionId: first })),
        textReply('What kind of interview is this?'),
      );
      await turn(cookie, second);

      expect(await toolOutput(second, 'get_interview')).toEqual(
        expect.objectContaining({ ok: true }),
      );

      fakeAnthropicApi.reply(
        toolStep(toolUse('list_interviews', {})),
        textReply('What kind of interview is this?'),
      );
      await turn(cookie, second, 'A technical round.');

      expect(await toolOutput(second, 'list_interviews')).toEqual({
        ok: true,
        interviews: [
          expect.objectContaining({ sessionId: second, current: true }),
          expect.objectContaining({ sessionId: first, finished: true }),
        ],
      });
    });

    it("refuses another application's interview", async () => {
      const { cookie } = await onboardedUser();
      const applicationId = await startApplication(cookie);
      const interviewId = await finishedInterview(cookie, applicationId);
      const otherApplication = await startApplication(cookie);

      fakeAnthropicApi.reply(
        toolStep(toolUse('get_interview', { sessionId: interviewId })),
        textReply('Scored.'),
      );
      await turn(cookie, otherApplication);

      expect(await toolOutput(otherApplication, 'get_interview')).toEqual(
        expect.objectContaining({ ok: false, reason: 'interview-not-found' }),
      );
    });
  });
});
