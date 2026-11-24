import { INestApplication } from '@nestjs/common';
import { SESSION_LIMITS } from '@quarry/contracts';
import { Types } from 'mongoose';
import { http, HttpResponse } from 'msw';
import request from 'supertest';
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  onTestFinished,
  vi,
} from 'vitest';
import { createTestApp } from '../../../../test/integration/create-test-app';
import { getTestDatabase } from '../../../../test/integration/database';
import { mswServer } from '../../../../test/integration/msw-server';
import {
  fakeAnthropicApi,
  type AnthropicReply,
} from '../../../../test/integration/fake-anthropic-api';
import {
  AGENT_MODEL,
  COMPACTION_TRIGGER_TOKENS,
  UNREVIEWED_RESUME_NOTE,
} from '../agent/agent.constants';
import { createFakeHostLookup } from '../job-fetcher/__integration__/fake-host-lookup';
import { JOB_FETCH_HOST_LOOKUP } from '../job-fetcher/job-fetcher.constants';
import { TurnLockReset } from '../turn-lock-reset';
import {
  signUp,
  TEST_ORIGIN,
} from '../../../lib/__integration__/sign-up.fixture';
import {
  deferred,
  findMessages,
  findSession,
  fitScoreInput,
  seedOnboarded,
  seedSessions,
  setSession,
} from '../../../../test/integration/session-fixtures';

// A first turn that saves a fit report, then says a line about it.
const fitReportReplies = (): AnthropicReply[] => [
  {
    kind: 'stream',
    blocks: [
      { type: 'thinking', thinking: 'Weighing the fit.', signature: 'sig-1' },
      {
        type: 'tool_use',
        id: 'toolu_fit',
        name: 'save_fit_score',
        input: fitScoreInput,
      },
    ],
    stopReason: 'tool_use',
    usage: {
      input_tokens: 3000,
      output_tokens: 500,
      cache_read_input_tokens: 1000,
      cache_creation_input_tokens: 2000,
    },
  },
  {
    kind: 'stream',
    blocks: [{ type: 'text', text: 'You are a strong fit.' }],
    usage: {
      input_tokens: 3600,
      output_tokens: 50,
      cache_read_input_tokens: 2500,
    },
  },
];

// The provider adds a custom part per step; stored like every other part.
const withoutCustomParts = (parts: { type: string }[]) =>
  parts.filter(({ type }) => type !== 'custom');

const textReply = (text: string): AnthropicReply => ({
  kind: 'stream',
  blocks: [{ type: 'text', text }],
});

const JOB_URL = 'https://boards.greenhouse.io/moniepoint/jobs/4012345';

describe('Sessions (integration)', () => {
  let app: INestApplication;

  const hostLookup = createFakeHostLookup();

  beforeAll(async () => {
    app = await createTestApp({
      overrides: [{ provide: JOB_FETCH_HOST_LOOKUP, useValue: hostLookup }],
    });
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

  describe('POST /sessions', () => {
    it('starts a session from a link with the first message stored', async () => {
      const { cookie } = await onboardedUser();

      const created = await api('post', '/sessions', cookie).send({
        jobUrl: JOB_URL,
      });

      expect(created.status).toBe(201);
      expect(created.body).toEqual({ id: expect.any(String) });

      const session = await api('get', `/sessions/${created.body.id}`, cookie);

      expect(session.body).toEqual({
        id: created.body.id,
        title: 'New application',
        company: null,
        job: { url: JOB_URL, source: null, location: null },
        status: 'ready',
        archivedAt: null,
        userMessageCount: 1,
        messageLimit: SESSION_LIMITS.userMessagesPerSession,
        messages: [
          {
            id: expect.any(String),
            role: 'user',
            parts: [
              { type: 'text', text: `Score my fit for this job: ${JOB_URL}` },
            ],
          },
        ],
      });
    });

    it('starts a session from a pasted description and keeps the text', async () => {
      const { cookie } = await onboardedUser();
      const description = 'Senior Backend Engineer at Moniepoint. Go, Kafka.';

      const created = await api('post', '/sessions', cookie).send({
        jobDescription: description,
      });

      expect(created.status).toBe(201);

      const [stored, messages] = await Promise.all([
        findSession(created.body.id),
        findMessages(created.body.id),
      ]);

      expect(stored?.job).toEqual({ source: 'pasted', description });

      expect(messages.map(({ role, parts }) => ({ role, parts }))).toEqual([
        {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: `Score my fit for this job:\n\n${description}`,
            },
          ],
        },
      ]);
    });

    it.each([
      ['neither', {}],
      ['both', { jobUrl: JOB_URL, jobDescription: 'A job' }],
      ['a non-http link', { jobUrl: 'ftp://example.com/job' }],
      ['an empty description', { jobDescription: '   ' }],
      [
        'a description over the cap',
        {
          jobDescription: 'x'.repeat(
            SESSION_LIMITS.jobDescriptionMaxLength + 1,
          ),
        },
      ],
    ])('refuses %s with a 400', async (_case, body) => {
      const { cookie } = await onboardedUser();

      expect((await api('post', '/sessions', cookie).send(body)).status).toBe(
        400,
      );
    });

    it.each(['parsing', 'failed'] as const)(
      'refuses with a 409 while the primary resume is %s',
      async (resumeState) => {
        const { cookie, userId } = await signUp(app);
        await seedOnboarded(userId, resumeState);

        const created = await api('post', '/sessions', cookie).send({
          jobUrl: JOB_URL,
        });

        expect(created.status).toBe(409);
        expect(created.body.code).toBe('primary-resume-not-ready');
      },
    );

    it('allows 10 sessions a calendar month, archived ones included', async () => {
      const { cookie, userId } = await onboardedUser();
      const start = new Date('2026-11-01T00:00:00.000Z');
      const resetsAt = '2026-12-01T00:00:00.000Z';

      // Seconds into a new UTC month, so the boundary is what's tested.
      vi.useFakeTimers({
        toFake: ['Date'],
        now: new Date('2026-11-01T00:00:05Z'),
      });

      onTestFinished(() => {
        vi.useRealTimers();
      });

      // One from the last moment of the previous month, which doesn't count.
      await seedSessions(userId, [new Date('2026-10-31T23:59:59.999Z')]);
      await seedSessions(userId, Array(8).fill(start));
      await seedSessions(userId, [start], { archivedAt: start });

      const tenth = await api('post', '/sessions', cookie).send({
        jobUrl: JOB_URL,
      });

      expect(tenth.status).toBe(201);

      const eleventh = await api('post', '/sessions', cookie).send({
        jobUrl: JOB_URL,
      });

      expect(eleventh.status).toBe(429);

      expect(eleventh.body).toMatchObject({
        code: 'monthly-session-limit',
        used: 10,
        limit: 10,
        resetsAt,
      });

      const usage = await api('get', '/usage', cookie);

      expect(usage.body).toEqual({
        sessions: { used: 10, limit: 10, resetsAt },
      });
    });

    it('needs a profile', async () => {
      const { cookie } = await signUp(app);

      expect(
        (await api('post', '/sessions', cookie).send({ jobUrl: JOB_URL }))
          .status,
      ).toBe(403);
    });
  });

  describe('listing and archiving', () => {
    it('lists active sessions newest first and moves archived ones to their own list', async () => {
      const { cookie } = await onboardedUser();

      const first = await api('post', '/sessions', cookie).send({
        jobUrl: JOB_URL,
      });

      const second = await api('post', '/sessions', cookie).send({
        jobDescription: 'A job',
      });

      const active = await api('get', '/sessions', cookie);

      expect(active.body.nextCursor).toBeNull();

      expect(active.body.items).toEqual([
        {
          id: second.body.id,
          title: 'New application',
          company: null,
          source: 'pasted',
          fitScore: null,
          fitLabel: null,
          status: 'ready',
          archivedAt: null,
          createdAt: expect.any(String),
        },
        expect.objectContaining({ id: first.body.id, source: null }),
      ]);

      const archived = await api(
        'patch',
        `/sessions/${first.body.id}`,
        cookie,
      ).send({ archived: true });

      expect(archived.status).toBe(200);
      expect(archived.body.archivedAt).toEqual(expect.any(String));

      const activeAfter = await api('get', '/sessions?archived=false', cookie);
      const archivedList = await api('get', '/sessions?archived=true', cookie);

      expect(
        activeAfter.body.items.map(({ id }: { id: string }) => id),
      ).toEqual([second.body.id]);

      expect(
        archivedList.body.items.map(({ id }: { id: string }) => id),
      ).toEqual([first.body.id]);

      await api('patch', `/sessions/${first.body.id}`, cookie).send({
        archived: false,
      });

      expect((await api('get', '/sessions', cookie)).body.items).toHaveLength(
        2,
      );
    });

    it('pages through sessions newest first with a cursor', async () => {
      const { cookie, userId } = await onboardedUser();
      const createdAt = new Date('2026-11-10T12:00:00Z');

      // Five sessions, two sharing a timestamp, so ties are paged by id.
      await seedSessions(userId, [
        new Date('2026-11-01T00:00:00Z'),
        createdAt,
        createdAt,
        new Date('2026-11-15T00:00:00Z'),
        new Date('2026-11-20T00:00:00Z'),
      ]);

      const pages: string[][] = [];
      let cursor: string | null = null;

      do {
        const query: string = cursor ? `&cursor=${cursor}` : '';
        const page = await api('get', `/sessions?limit=2${query}`, cookie);

        expect(page.status).toBe(200);
        pages.push(page.body.items.map(({ id }: { id: string }) => id));
        cursor = page.body.nextCursor;
      } while (cursor);

      const all = await api('get', '/sessions', cookie);
      const ids = all.body.items.map(({ id }: { id: string }) => id);

      expect(all.body.nextCursor).toBeNull();
      expect(ids).toHaveLength(5);
      expect(pages.map((page) => page.length)).toEqual([2, 2, 1]);
      expect(pages.flat()).toEqual(ids);

      expect(
        all.body.items.map(({ createdAt }: { createdAt: string }) => createdAt),
      ).toEqual([
        '2026-11-20T00:00:00.000Z',
        '2026-11-15T00:00:00.000Z',
        '2026-11-10T12:00:00.000Z',
        '2026-11-10T12:00:00.000Z',
        '2026-11-01T00:00:00.000Z',
      ]);
    });

    it("refuses a cursor that isn't one of the user's sessions", async () => {
      const owner = await onboardedUser();
      const other = await onboardedUser('bola@example.com');

      const created = await api('post', '/sessions', owner.cookie).send({
        jobUrl: JOB_URL,
      });

      const foreign = await api(
        'get',
        `/sessions?cursor=${created.body.id}`,
        other.cookie,
      );

      const malformed = await api(
        'get',
        '/sessions?cursor=not-an-id',
        owner.cookie,
      );

      const tooMany = await api('get', '/sessions?limit=51', owner.cookie);

      expect([foreign.status, malformed.status, tooMany.status]).toEqual([
        400, 400, 400,
      ]);
    });

    it("returns 404 for another user's session", async () => {
      const owner = await onboardedUser();
      const other = await onboardedUser('bola@example.com');

      const created = await api('post', '/sessions', owner.cookie).send({
        jobUrl: JOB_URL,
      });

      const id = created.body.id as string;

      expect((await api('get', `/sessions/${id}`, other.cookie)).status).toBe(
        404,
      );

      expect(
        (
          await api('patch', `/sessions/${id}`, other.cookie).send({
            archived: true,
          })
        ).status,
      ).toBe(404);

      expect(
        (await api('post', `/sessions/${id}/turns`, other.cookie).send({}))
          .status,
      ).toBe(404);

      expect(
        (await api('get', '/sessions/not-an-id', other.cookie)).status,
      ).toBe(404);
    });
  });

  describe('turns', () => {
    const startPasted = async (cookie: string[]) => {
      const created = await api('post', '/sessions', cookie).send({
        jobDescription: 'Senior Backend Engineer at Moniepoint. Go, Kafka.',
      });

      return created.body.id as string;
    };

    const turn = (cookie: string[], id: string, body: object = {}) =>
      api('post', `/sessions/${id}/turns`, cookie).send(body);

    it('streams the first turn, saves the fit report and names the session', async () => {
      const { cookie } = await onboardedUser();
      const id = await startPasted(cookie);
      fakeAnthropicApi.reply(...fitReportReplies());

      const response = await turn(cookie, id);

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/event-stream');
      expect(response.text).toContain('You are a strong fit.');

      const session = await findSession(id);

      expect(session).toMatchObject({
        title: 'Senior Backend Engineer',
        company: 'Moniepoint',
        turnStartedAt: null,
      });

      const [, assistant] = await findMessages(id);

      expect(assistant.role).toBe('assistant');

      expect(assistant.usage).toEqual({
        model: AGENT_MODEL,
        // Input includes the cached tokens read and written.
        inputTokens: 12100,
        outputTokens: 550,
        cacheReadTokens: 3500,
        cacheWriteTokens: 2000,
      });

      expect(withoutCustomParts(assistant.parts)).toEqual([
        { type: 'step-start' },
        expect.objectContaining({
          type: 'reasoning',
          text: 'Weighing the fit.',
          providerMetadata: { anthropic: { signature: 'sig-1' } },
        }),
        expect.objectContaining({
          type: 'tool-save_fit_score',
          toolCallId: 'toolu_fit',
          state: 'output-available',
          input: fitScoreInput,
          output: expect.objectContaining({
            document: expect.objectContaining({ kind: 'fit-score' }),
          }),
        }),
        { type: 'step-start' },
        expect.objectContaining({
          type: 'text',
          text: 'You are a strong fit.',
        }),
      ]);
    });

    it('reads the job from a link and saves it on the session', async () => {
      const { cookie } = await onboardedUser();

      const created = await api('post', '/sessions', cookie).send({
        jobUrl: JOB_URL,
      });

      const id = created.body.id as string;

      mswServer.use(
        http.get(
          'https://boards-api.greenhouse.io/v1/boards/moniepoint/jobs/4012345',
          () =>
            HttpResponse.json({
              id: 4012345,
              title: 'Senior Backend Engineer',
              company_name: 'Moniepoint',
              location: { name: 'Lagos, Nigeria' },
              content: '&lt;p&gt;Build payments in Go.&lt;/p&gt;',
            }),
        ),
      );

      fakeAnthropicApi.reply(
        {
          kind: 'stream',
          blocks: [
            {
              type: 'tool_use',
              id: 'toolu_job',
              name: 'get_job_description',
              input: { url: JOB_URL },
            },
          ],
          stopReason: 'tool_use',
        },
        textReply('Got it.'),
      );

      expect((await turn(cookie, id)).status).toBe(200);

      expect(await findSession(id)).toMatchObject({
        title: 'Senior Backend Engineer',
        company: 'Moniepoint',
        job: {
          url: JOB_URL,
          source: 'greenhouse',
          location: 'Lagos, Nigeria',
          description: 'Build payments in Go.',
          fetchedAt: expect.any(Date),
        },
      });

      const [, assistant] = await findMessages(id);

      expect(assistant.parts).toContainEqual(
        expect.objectContaining({
          type: 'tool-get_job_description',
          state: 'output-available',
          toolMetadata: {
            icon: 'globe',
            active: 'Reading the job post',
            done: 'Read the job post',
            failed: "Couldn't read the job post",
          },
          output: expect.objectContaining({
            ok: true,
            source: 'greenhouse',
            description: 'Build payments in Go.',
            note: 'Greenhouse',
          }),
        }),
      );
    });

    it('passes a blocked site back to the model with a reason to ask for a paste', async () => {
      const { cookie } = await onboardedUser();
      const link = 'https://www.linkedin.com/jobs/view/123';

      const created = await api('post', '/sessions', cookie).send({
        jobUrl: link,
      });

      fakeAnthropicApi.reply(
        {
          kind: 'stream',
          blocks: [
            {
              type: 'tool_use',
              id: 'toolu_job',
              name: 'get_job_description',
              input: { url: link },
            },
          ],
          stopReason: 'tool_use',
        },
        textReply('Paste it, please.'),
      );

      await turn(cookie, created.body.id);

      const toolResult = fakeAnthropicApi.requests[1].messages[2].content[0];

      expect(JSON.stringify(toolResult)).toContain('blocked-site');
      expect(JSON.stringify(toolResult)).toContain('askForPaste');
      expect((await findSession(created.body.id))?.job).toEqual({ url: link });

      const [, assistant] = await findMessages(created.body.id);

      expect(assistant.parts).toContainEqual(
        expect.objectContaining({
          type: 'tool-get_job_description',
          state: 'output-available',
          output: expect.objectContaining({
            ok: false,
            reason: 'blocked-site',
            note: 'LinkedIn blocks us',
          }),
        }),
      );
    });

    it('asks Sonnet with medium effort, cached system messages, the tools and compaction at 100k', async () => {
      const { cookie } = await onboardedUser();
      const id = await startPasted(cookie);
      fakeAnthropicApi.reply(textReply('Hello.'));

      await turn(cookie, id);

      const [sent] = fakeAnthropicApi.requests;

      expect(sent.model).toBe(AGENT_MODEL);
      expect(sent.output_config?.effort).toBe('medium');
      expect(sent.system).toHaveLength(2);
      expect(sent.system?.[1].text).toContain('"name":"Ada Obi"');
      expect(sent.system?.[1].text).not.toContain(UNREVIEWED_RESUME_NOTE);

      for (const block of sent.system ?? []) {
        expect(block.cache_control).toEqual({ type: 'ephemeral' });
      }

      expect(sent.tools?.map(({ name }) => name).sort()).toEqual([
        'create_tailored_resume',
        'edit_tailored_resume',
        'get_job_description',
        'save_cover_letter',
        'save_fit_score',
      ]);

      expect(sent.tool_choice).toEqual({ type: 'auto' });

      expect(sent.context_management?.edits).toEqual([
        expect.objectContaining({
          type: 'compact_20260112',
          trigger: { type: 'input_tokens', value: COMPACTION_TRIGGER_TOKENS },
        }),
      ]);

      expect(fakeAnthropicApi.betas[0]).toContain('compact-2026-01-12');
    });

    it('works from an unreviewed primary resume and tells the agent so', async () => {
      const { cookie, userId } = await signUp(app);
      await seedOnboarded(userId, 'unreviewed');
      const id = await startPasted(cookie);
      fakeAnthropicApi.reply(textReply('Hello.'));

      expect((await turn(cookie, id)).status).toBe(200);

      const [sent] = fakeAnthropicApi.requests;
      expect(sent.system?.[1].text).toContain(UNREVIEWED_RESUME_NOTE);
    });

    it('refuses a turn with a 409 and stores nothing while the primary resume is being read again', async () => {
      const { cookie, userId } = await onboardedUser();
      const id = await startPasted(cookie);

      await getTestDatabase()
        .collection('resumes')
        .updateOne(
          { user: new Types.ObjectId(userId), kind: 'primary' },
          { $set: { parseStatus: 'parsing' } },
        );

      const response = await turn(cookie, id, {
        message: { id: 'msg-1', text: 'Tailor my resume.' },
      });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe('primary-resume-not-ready');
      expect(await findMessages(id)).toHaveLength(1);

      expect(await findSession(id)).toMatchObject({
        userMessageCount: 1,
        turnStartedAt: null,
      });

      expect(fakeAnthropicApi.requests).toHaveLength(0);
    });

    it('resends the stored history unchanged on the next turn', async () => {
      const { cookie } = await onboardedUser();
      const id = await startPasted(cookie);
      fakeAnthropicApi.reply(...fitReportReplies());
      await turn(cookie, id);

      fakeAnthropicApi.reply(textReply('Sure.'));

      const next = await turn(cookie, id, {
        message: { id: 'msg-user-2', text: 'Thanks' },
      });

      expect(next.status).toBe(200);

      const sent = fakeAnthropicApi.requests[2];

      expect(sent.messages.map(({ role }) => role)).toEqual([
        'user',
        'assistant',
        'user',
        'assistant',
        'user',
      ]);

      expect(sent.messages[1].content).toEqual([
        { type: 'thinking', thinking: 'Weighing the fit.', signature: 'sig-1' },
        expect.objectContaining({
          type: 'tool_use',
          id: 'toolu_fit',
          name: 'save_fit_score',
          input: fitScoreInput,
        }),
      ]);

      expect(sent.messages[2].content).toEqual([
        expect.objectContaining({
          type: 'tool_result',
          tool_use_id: 'toolu_fit',
        }),
      ]);

      expect(sent.messages[4].content).toEqual([
        expect.objectContaining({ type: 'text', text: 'Thanks' }),
      ]);

      const messages = await findMessages(id);

      expect(messages.map(({ role, uiId }) => [role, uiId])).toEqual([
        ['user', expect.any(String)],
        ['assistant', expect.any(String)],
        ['user', 'msg-user-2'],
        ['assistant', expect.any(String)],
      ]);

      expect((await findSession(id))?.userMessageCount).toBe(2);
    });

    it('stores a compaction block, sends it back and hides it from the chat', async () => {
      const { cookie } = await onboardedUser();
      const id = await startPasted(cookie);

      fakeAnthropicApi.reply({
        kind: 'stream',
        blocks: [
          {
            type: 'compaction',
            content: 'Earlier: the user wants one page.',
            signature: 'compaction-sig',
          },
          { type: 'text', text: 'Done.' },
        ],
      });

      await turn(cookie, id);

      fakeAnthropicApi.reply(textReply('Again.'));
      await turn(cookie, id, { message: { id: 'msg-2', text: 'Again' } });

      expect(fakeAnthropicApi.requests[1].messages[1].content).toEqual([
        expect.objectContaining({
          type: 'compaction',
          content: 'Earlier: the user wants one page.',
          signature: 'compaction-sig',
        }),
        expect.objectContaining({ type: 'text', text: 'Done.' }),
      ]);

      const session = await api('get', `/sessions/${id}`, cookie);
      const assistantParts = session.body.messages[1].parts;

      expect(withoutCustomParts(assistantParts)).toEqual([
        { type: 'step-start' },
        expect.objectContaining({ type: 'text', text: 'Done.' }),
      ]);

      expect(session.body.messages[1]).not.toHaveProperty('usage');
    });

    it('runs one of two overlapping turns and refuses the other with a 409', async () => {
      const { cookie } = await onboardedUser();
      const id = await startPasted(cookie);
      const gate = deferred();

      fakeAnthropicApi.reply({
        kind: 'stream',
        blocks: [
          { type: 'text', text: 'First half. ' },
          { type: 'text', text: 'Second half.' },
        ],
        pauseAfterFirstBlock: gate.promise,
      });

      const first = turn(cookie, id).then((response) => response);

      await vi.waitFor(
        async () => expect((await findSession(id))?.turnStartedAt).toBeTruthy(),
        { timeout: 5_000, interval: 20 },
      );

      const second = await turn(cookie, id, {
        message: { id: 'msg-2', text: 'Hello?' },
      });

      expect(second.status).toBe(409);
      expect(second.body.code).toBe('turn-running');

      const listed = await api('get', '/sessions', cookie);
      expect(listed.body.items[0].status).toBe('drafting');

      gate.resolve();

      expect((await first).status).toBe(200);
      expect(fakeAnthropicApi.requests).toHaveLength(1);
      expect((await findSession(id))?.turnStartedAt).toBeNull();
      // The refused message was never stored or counted.
      expect(await findMessages(id)).toHaveLength(2);
      expect((await findSession(id))?.userMessageCount).toBe(1);
    });

    it('clears every turn lock when the server starts', async () => {
      const { cookie } = await onboardedUser();
      const id = await startPasted(cookie);
      await setSession(id, { turnStartedAt: new Date() });

      await app.get(TurnLockReset).onApplicationBootstrap();

      expect((await findSession(id))?.turnStartedAt).toBeNull();
    });

    it('refuses the 41st user message with a 429', async () => {
      const { cookie } = await onboardedUser();
      const id = await startPasted(cookie);

      await setSession(id, {
        userMessageCount: SESSION_LIMITS.userMessagesPerSession,
      });

      const refused = await turn(cookie, id, {
        message: { id: 'msg-41', text: 'One more' },
      });

      expect(refused.status).toBe(429);
      expect(refused.body.code).toBe('session-message-limit');
      expect(fakeAnthropicApi.requests).toHaveLength(0);
    });

    it('refuses turns on an archived session', async () => {
      const { cookie } = await onboardedUser();
      const id = await startPasted(cookie);
      await api('patch', `/sessions/${id}`, cookie).send({ archived: true });

      const refused = await turn(cookie, id);

      expect(refused.status).toBe(409);
      expect(refused.body.code).toBe('session-archived');
    });

    it('refuses a turn without a message once everything is answered', async () => {
      const { cookie } = await onboardedUser();
      const id = await startPasted(cookie);
      fakeAnthropicApi.reply(textReply('Hello.'));
      await turn(cookie, id);

      const refused = await turn(cookie, id);

      expect(refused.status).toBe(400);
      expect(refused.body.code).toBe('nothing-to-answer');
      expect((await findSession(id))?.turnStartedAt).toBeNull();
    });

    it('saves nothing and releases the lock when Claude fails', async () => {
      const { cookie } = await onboardedUser();
      const id = await startPasted(cookie);
      fakeAnthropicApi.reply({ kind: 'error', status: 400 });

      const response = await turn(cookie, id);

      expect(response.status).toBe(200);
      expect(response.text).toContain('Something went wrong');
      expect(await findMessages(id)).toHaveLength(1);
      expect((await findSession(id))?.turnStartedAt).toBeNull();
    });

    it('drops a reply that fails after a tool step and releases the lock', async () => {
      const { cookie } = await onboardedUser();
      const id = await startPasted(cookie);
      const [toolStep] = fitReportReplies();
      fakeAnthropicApi.reply(toolStep, { kind: 'error', status: 400 });

      const response = await turn(cookie, id);

      expect(response.text).toContain('Something went wrong');
      expect(await findMessages(id)).toHaveLength(1);
      expect((await findSession(id))?.turnStartedAt).toBeNull();
    });

    it('stores and counts a resent message only once', async () => {
      const { cookie } = await onboardedUser();
      const id = await startPasted(cookie);
      fakeAnthropicApi.reply(textReply('Hello.'));
      await turn(cookie, id);

      const message = { id: 'msg-user-2', text: 'Thanks' };
      fakeAnthropicApi.reply(textReply('Sure.'));
      await turn(cookie, id, { message });

      const resent = await turn(cookie, id, { message });

      expect(resent.status).toBe(400);
      expect(resent.body.code).toBe('nothing-to-answer');
      expect(await findMessages(id)).toHaveLength(4);
      expect((await findSession(id))?.userMessageCount).toBe(2);
    });

    it('still saves the reply when the client disconnects mid-turn', async () => {
      const { cookie } = await onboardedUser();
      const id = await startPasted(cookie);
      const gate = deferred();

      fakeAnthropicApi.reply({
        kind: 'stream',
        blocks: [
          { type: 'text', text: 'Before the drop. ' },
          { type: 'text', text: 'After the drop.' },
        ],
        pauseAfterFirstBlock: gate.promise,
      });

      const server = app.getHttpServer();

      if (!server.listening)
        await new Promise((done) => server.listen(0, done));

      const { port } = server.address() as { port: number };
      const controller = new AbortController();

      const response = await fetch(
        `http://127.0.0.1:${port}/api/sessions/${id}/turns`,
        {
          method: 'POST',
          headers: {
            Origin: TEST_ORIGIN,
            Cookie: cookie.join('; '),
            'Content-Type': 'application/json',
          },
          body: '{}',
          signal: controller.signal,
        },
      );

      const reader = response.body!.getReader();
      await reader.read();
      controller.abort();

      gate.resolve();

      await vi.waitFor(
        async () => {
          const messages = await findMessages(id);
          expect(messages).toHaveLength(2);

          expect(messages[1].parts).toContainEqual(
            expect.objectContaining({ type: 'text', text: 'After the drop.' }),
          );
        },
        { timeout: 5_000, interval: 20 },
      );

      expect((await findSession(id))?.turnStartedAt).toBeNull();
    });

    describe('stopping a turn', () => {
      const stop = (cookie: string[], id: string, messageId: string) =>
        api('post', `/sessions/${id}/turns/stop`, cookie).send({ messageId });

      const firstMessageId = async (id: string) =>
        (await findMessages(id))[0].uiId as string;

      const waitForTurn = (id: string) =>
        vi.waitFor(
          async () =>
            expect((await findSession(id))?.turnStartedAt).toBeTruthy(),
          { timeout: 5_000, interval: 20 },
        );

      it('stores none of a stopped reply, keeps a saved document and releases the lock', async () => {
        const { cookie } = await onboardedUser();
        const id = await startPasted(cookie);
        const [toolStep] = fitReportReplies();
        // Held open after its first block until the test ends.
        const never = deferred();
        onTestFinished(() => never.resolve());

        fakeAnthropicApi.reply(toolStep, {
          kind: 'stream',
          blocks: [
            { type: 'text', text: 'Partly written. ' },
            { type: 'text', text: 'Never sent.' },
          ],
          pauseAfterFirstBlock: never.promise,
        });

        const running = turn(cookie, id).then((response) => response);

        await vi.waitFor(
          () => expect(fakeAnthropicApi.requests).toHaveLength(2),
          { timeout: 5_000, interval: 20 },
        );

        const stopped = await stop(cookie, id, await firstMessageId(id));

        expect(stopped.status).toBe(204);
        expect((await running).status).toBe(200);
        // The held second request to Claude was cancelled.
        expect(fakeAnthropicApi.cancelled.has(1)).toBe(true);
        // The lock is released by the time the stop is answered.
        expect((await findSession(id))?.turnStartedAt).toBeNull();
        expect(await findMessages(id)).toHaveLength(1);

        expect(
          await getTestDatabase()
            .collection('fit-scores')
            .countDocuments({ session: new Types.ObjectId(id) }),
        ).toBe(1);

        // Retry answers the same message without counting it again.
        fakeAnthropicApi.reply(textReply('Here it is.'));
        const retried = await turn(cookie, id);

        expect(retried.status).toBe(200);
        expect(await findMessages(id)).toHaveLength(2);
        expect((await findSession(id))?.userMessageCount).toBe(1);
      });

      it('saves nothing from a job fetch still running at the stop', async () => {
        const { cookie } = await onboardedUser();

        const created = await api('post', '/sessions', cookie).send({
          jobUrl: JOB_URL,
        });

        const id = created.body.id as string;
        const fetching = deferred();
        const release = deferred();
        onTestFinished(() => release.resolve());

        mswServer.use(
          http.get(
            'https://boards-api.greenhouse.io/v1/boards/moniepoint/jobs/4012345',
            async () => {
              fetching.resolve();
              await release.promise;

              return HttpResponse.json({
                id: 4012345,
                title: 'Senior Backend Engineer',
                company_name: 'Moniepoint',
                content: '&lt;p&gt;Build payments in Go.&lt;/p&gt;',
              });
            },
          ),
        );

        fakeAnthropicApi.reply({
          kind: 'stream',
          blocks: [
            {
              type: 'tool_use',
              id: 'toolu_job',
              name: 'get_job_description',
              input: { url: JOB_URL },
            },
          ],
          stopReason: 'tool_use',
        });

        const running = turn(cookie, id).then((response) => response);
        await fetching.promise;
        await stop(cookie, id, await firstMessageId(id));
        await running;

        release.resolve();
        // Lets the cut-off fetch finish before checking it wrote nothing.
        await new Promise((done) => setTimeout(done, 200));

        const session = await findSession(id);
        expect(session?.title).toBe('New application');
        expect(session?.job).toEqual({ url: JOB_URL });
      });

      it('answers a stop with no turn running', async () => {
        const { cookie } = await onboardedUser();
        const id = await startPasted(cookie);

        const stopped = await stop(cookie, id, await firstMessageId(id));

        expect(stopped.status).toBe(204);
      });

      it('leaves a turn answering another message running', async () => {
        const { cookie } = await onboardedUser();
        const id = await startPasted(cookie);
        const gate = deferred();
        onTestFinished(() => gate.resolve());

        fakeAnthropicApi.reply({
          kind: 'stream',
          blocks: [
            { type: 'text', text: 'First half. ' },
            { type: 'text', text: 'Second half.' },
          ],
          pauseAfterFirstBlock: gate.promise,
        });

        const running = turn(cookie, id).then((response) => response);
        await waitForTurn(id);

        const stopped = await stop(cookie, id, 'msg-earlier');

        expect(stopped.status).toBe(204);
        gate.resolve();
        await running;
        expect(await findMessages(id)).toHaveLength(2);
      });

      it("returns 404 for another user's session", async () => {
        const { cookie } = await onboardedUser();
        const id = await startPasted(cookie);
        const other = await onboardedUser('other@example.com');
        const gate = deferred();
        onTestFinished(() => gate.resolve());

        fakeAnthropicApi.reply({
          kind: 'stream',
          blocks: [
            { type: 'text', text: 'First half. ' },
            { type: 'text', text: 'Second half.' },
          ],
          pauseAfterFirstBlock: gate.promise,
        });

        const running = turn(cookie, id).then((response) => response);
        await waitForTurn(id);

        const refused = await stop(other.cookie, id, await firstMessageId(id));

        expect(refused.status).toBe(404);
        gate.resolve();
        await running;
        expect(await findMessages(id)).toHaveLength(2);
      });
    });
  });
});
