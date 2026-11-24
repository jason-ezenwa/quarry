import { INestApplication } from '@nestjs/common';
import type { CoverLetterInput, Resume } from '@quarry/contracts';
import mammoth from 'mammoth';
import { Types } from 'mongoose';
import request from 'supertest';
import { extractText } from 'unpdf';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from '../../../../test/integration/create-test-app';
import { getTestDatabase } from '../../../../test/integration/database';
import {
  fakeAnthropicApi,
  type SentBlock,
} from '../../../../test/integration/fake-anthropic-api';
import {
  signUp,
  TEST_ORIGIN,
} from '../../../lib/__integration__/sign-up.fixture';
import {
  runTools as runToolsIn,
  type ToolCall,
} from '../../../../test/integration/run-tools';
import {
  fitScoreInput,
  primaryResume,
  seedOnboarded,
} from '../../../../test/integration/session-fixtures';

// Its own contact line: the agent may add a link the primary resume lacks.
const tailoredResume: Resume = {
  name: primaryResume.name,
  contact: {
    ...primaryResume.contact,
    links: [{ label: 'Portfolio', url: 'https://ada.dev' }],
  },
  summary: 'Payments engineer who ships settlement systems.',
  experience: [
    {
      title: 'Backend Engineer',
      company: 'Paystack',
      location: 'Lagos',
      startDate: '2021-03',
      bullets: ['Built the settlement service in Go.'],
    },
  ],
  education: [],
  skills: [{ name: 'Go' }, { name: 'TypeScript' }],
  projects: [],
  certifications: [],
};

const coverLetter: CoverLetterInput = {
  name: 'Payments-first letter',
  greeting: 'Dear Moniepoint team,',
  paragraphs: [
    'I build payment systems that settle on time.',
    'At Paystack I built the settlement service.',
    'I would like to bring that to Moniepoint.',
  ],
  signOff: 'Kind regards,',
};

// Parts of a stored tool call the specs read.
type StoredToolPart = { type: string; state: string; output?: unknown };

describe('Documents (integration)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  const get = (path: string, cookie: string[]) =>
    request(app.getHttpServer())
      .get(`/api${path}`)
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', cookie);

  // A binary body as a Buffer, so specs can read the file.
  const download = (path: string, cookie: string[]) =>
    get(path, cookie)
      .buffer(true)
      .parse((response, done) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => done(null, Buffer.concat(chunks)));
      });

  const onboardedUser = async (email?: string) => {
    const user = await signUp(app, email ? { email } : {});
    await seedOnboarded(user.userId);

    return user;
  };

  const startSession = async (cookie: string[]) => {
    const created = await request(app.getHttpServer())
      .post('/api/sessions')
      .set('Origin', TEST_ORIGIN)
      .set('Cookie', cookie)
      .send({ jobDescription: 'Senior Backend Engineer at Moniepoint.' });

    return created.body.id as string;
  };

  const runTools = (cookie: string[], sessionId: string, calls: ToolCall[]) =>
    runToolsIn(app, cookie, sessionId, calls);

  // The tool results the app sent back to Claude after the latest tool step.
  const lastToolResults = () => {
    const sent = fakeAnthropicApi.requests.at(-1)!;

    return sent.messages
      .at(-1)!
      .content.filter(
        (block): block is Extract<SentBlock, { type: 'tool_result' }> =>
          block.type === 'tool_result',
      );
  };

  const lastToolParts = async (sessionId: string) => {
    const [assistant] = await getTestDatabase()
      .collection('messages')
      .find({ session: new Types.ObjectId(sessionId), role: 'assistant' })
      .sort({ createdAt: -1, _id: -1 })
      .limit(1)
      .toArray();

    return (assistant.parts as StoredToolPart[]).filter(({ type }) =>
      type.startsWith('tool-'),
    );
  };

  const tailoredResumes = (sessionId: string) =>
    getTestDatabase()
      .collection('resumes')
      .find({ session: new Types.ObjectId(sessionId), kind: 'tailored' })
      .sort({ createdAt: 1, _id: 1 })
      .toArray();

  const coverLetters = (sessionId: string) =>
    getTestDatabase()
      .collection('cover-letters')
      .find({ session: new Types.ObjectId(sessionId) })
      .toArray();

  const createResume = async (cookie: string[], sessionId: string) => {
    await runTools(cookie, sessionId, [
      {
        name: 'create_tailored_resume',
        input: { name: 'Payments focus', resume: tailoredResume },
      },
    ]);

    const [created] = await tailoredResumes(sessionId);

    return created._id.toHexString();
  };

  describe('tailored resumes', () => {
    it('saves a tailored resume and reads it back by kind and id', async () => {
      const { cookie } = await onboardedUser();
      const sessionId = await startSession(cookie);
      const resumeId = await createResume(cookie, sessionId);

      const [part] = await lastToolParts(sessionId);

      expect(part).toMatchObject({
        type: 'tool-create_tailored_resume',
        state: 'output-available',
        toolMetadata: {
          icon: 'file-text',
          active: 'Tailoring your resume',
          done: 'Tailored your resume',
          failed: "Couldn't tailor your resume",
        },
        output: {
          document: { kind: 'resume', id: resumeId, name: 'Payments focus' },
        },
      });

      const response = await get(
        `/sessions/${sessionId}/documents/resume/${resumeId}`,
        cookie,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: resumeId,
        kind: 'resume',
        name: 'Payments focus',
        resume: tailoredResume,
        sourceResume: null,
        createdAt: expect.any(String),
      });
    });

    it('saves an edit as a new resume and leaves its source untouched', async () => {
      const { cookie } = await onboardedUser();
      const sessionId = await startSession(cookie);
      const sourceId = await createResume(cookie, sessionId);
      const [sourceBefore] = await tailoredResumes(sessionId);

      await runTools(cookie, sessionId, [
        {
          name: 'edit_tailored_resume',
          input: {
            sourceResumeId: sourceId,
            name: 'One page, Kafka first',
            sections: {
              name: 'Ada N. Obi',
              contact: { email: 'ada@work.dev', links: [] },
              summary: 'Kafka and payments.',
              skills: [{ name: 'Kafka' }],
            },
          },
        },
      ]);

      const [sourceAfter, edited] = await tailoredResumes(sessionId);

      expect(sourceAfter).toEqual(sourceBefore);

      const [part] = await lastToolParts(sessionId);
      expect(part).toMatchObject({
        type: 'tool-edit_tailored_resume',
        output: {
          document: {
            kind: 'resume',
            id: edited._id.toHexString(),
            name: 'One page, Kafka first',
          },
        },
      });

      const response = await get(
        `/sessions/${sessionId}/documents/resume/${edited._id.toHexString()}`,
        cookie,
      );

      expect(response.body).toMatchObject({
        name: 'One page, Kafka first',
        sourceResume: sourceId,
        resume: {
          ...tailoredResume,
          name: 'Ada N. Obi',
          contact: { email: 'ada@work.dev', links: [] },
          summary: 'Kafka and payments.',
          skills: [{ name: 'Kafka' }],
        },
      });
    });

    it.each([
      ['an unknown section', { hobbies: ['Chess'] }],
      [
        'a section that breaks its schema',
        { experience: [{ title: 'Engineer', bullets: [] }] },
      ],
      ['no sections', {}],
    ])(
      'rejects %s back to the model and saves nothing',
      async (_case, sections) => {
        const { cookie } = await onboardedUser();
        const sessionId = await startSession(cookie);
        const sourceId = await createResume(cookie, sessionId);

        await runTools(cookie, sessionId, [
          {
            name: 'edit_tailored_resume',
            input: { sourceResumeId: sourceId, name: 'Broken', sections },
          },
        ]);

        expect(await tailoredResumes(sessionId)).toHaveLength(1);

        const [result] = lastToolResults();
        expect(result).toMatchObject({
          tool_use_id: 'toolu_0',
          is_error: true,
        });

        const [part] = await lastToolParts(sessionId);
        expect(part).toMatchObject({
          type: 'tool-edit_tailored_resume',
          state: 'output-error',
        });
      },
    );

    it('refuses a source resume from another session', async () => {
      const { cookie } = await onboardedUser();
      const firstSessionId = await startSession(cookie);
      const otherSessionsResume = await createResume(cookie, firstSessionId);
      const sessionId = await startSession(cookie);

      await runTools(cookie, sessionId, [
        {
          name: 'edit_tailored_resume',
          input: {
            sourceResumeId: otherSessionsResume,
            name: 'Borrowed',
            sections: { summary: 'Hello.' },
          },
        },
      ]);

      expect(await tailoredResumes(sessionId)).toHaveLength(0);
      expect(await tailoredResumes(firstSessionId)).toHaveLength(1);

      const [part] = await lastToolParts(sessionId);
      expect(part).toMatchObject({
        type: 'tool-edit_tailored_resume',
        state: 'output-available',
        output: {
          ok: false,
          reason: 'source-not-found',
          note: 'Source resume not found',
        },
      });
    });
  });

  describe('cover letters', () => {
    it("saves a cover letter and reads it back under the primary resume's header when no resume is tailored", async () => {
      const { cookie } = await onboardedUser();
      const sessionId = await startSession(cookie);

      await runTools(cookie, sessionId, [
        { name: 'save_cover_letter', input: coverLetter },
      ]);

      const [saved] = await coverLetters(sessionId);
      const coverLetterId = saved._id.toHexString();

      const [part] = await lastToolParts(sessionId);
      expect(part).toMatchObject({
        type: 'tool-save_cover_letter',
        output: {
          document: {
            kind: 'cover-letter',
            id: coverLetterId,
            name: 'Payments-first letter',
          },
        },
      });

      const response = await get(
        `/sessions/${sessionId}/documents/cover-letter/${coverLetterId}`,
        cookie,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: coverLetterId,
        kind: 'cover-letter',
        name: 'Payments-first letter',
        header: { name: primaryResume.name, contact: primaryResume.contact },
        greeting: coverLetter.greeting,
        paragraphs: coverLetter.paragraphs,
        signOff: coverLetter.signOff,
        createdAt: expect.any(String),
      });
    });

    it("takes the latest tailored resume's header by default", async () => {
      const { cookie } = await onboardedUser();
      const sessionId = await startSession(cookie);
      const sourceId = await createResume(cookie, sessionId);
      const latestContact = { email: 'ada@work.dev', links: [] };

      await runTools(cookie, sessionId, [
        {
          name: 'edit_tailored_resume',
          input: {
            sourceResumeId: sourceId,
            name: 'Work email',
            sections: { name: 'Ada N. Obi', contact: latestContact },
          },
        },
      ]);
      await runTools(cookie, sessionId, [
        { name: 'save_cover_letter', input: coverLetter },
      ]);

      const [saved] = await coverLetters(sessionId);
      const response = await get(
        `/sessions/${sessionId}/documents/cover-letter/${saved._id.toHexString()}`,
        cookie,
      );

      expect(response.body.header).toEqual({
        name: 'Ada N. Obi',
        contact: latestContact,
      });
    });

    it('keeps a header the user asked for on that letter', async () => {
      const { cookie } = await onboardedUser();
      const sessionId = await startSession(cookie);
      const header = {
        name: 'Ada Obi',
        contact: {
          email: 'ada@work.dev',
          links: [{ label: 'GitHub', url: 'https://github.com/ada' }],
        },
      };

      await runTools(cookie, sessionId, [
        { name: 'save_cover_letter', input: { ...coverLetter, header } },
      ]);

      const [saved] = await coverLetters(sessionId);
      const response = await get(
        `/sessions/${sessionId}/documents/cover-letter/${saved._id.toHexString()}`,
        cookie,
      );

      expect(response.body.header).toEqual(header);
    });

    it.each([2, 6])(
      'rejects a letter with %i paragraphs back to the model',
      async (count) => {
        const { cookie } = await onboardedUser();
        const sessionId = await startSession(cookie);

        await runTools(cookie, sessionId, [
          {
            name: 'save_cover_letter',
            input: {
              ...coverLetter,
              paragraphs: Array.from(
                { length: count },
                (_, index) => `Paragraph ${index + 1}.`,
              ),
            },
          },
        ]);

        expect(await coverLetters(sessionId)).toHaveLength(0);
        expect(lastToolResults()[0]).toMatchObject({ is_error: true });
      },
    );
  });

  describe('fit reports', () => {
    it('saves a fit report and returns it rounded, labelled and out of 100', async () => {
      const { cookie } = await onboardedUser();
      const sessionId = await startSession(cookie);

      await runTools(cookie, sessionId, [
        { name: 'save_fit_score', input: fitScoreInput },
      ]);

      const fitScore = await getTestDatabase()
        .collection('fit-scores')
        .findOne({ session: new Types.ObjectId(sessionId) });
      const documentId = fitScore!._id.toHexString();

      expect(fitScore!.overall).toBeCloseTo(85.85, 5);

      const [part] = await lastToolParts(sessionId);
      expect(part).toMatchObject({
        type: 'tool-save_fit_score',
        state: 'output-available',
        toolMetadata: {
          icon: 'gauge',
          active: 'Scoring your fit',
          done: 'Scored your fit',
          failed: "Couldn't score your fit",
        },
        output: {
          document: {
            kind: 'fit-score',
            id: documentId,
            name: 'First read',
            score: 86,
            label: 'strong-fit',
          },
          note: '86%',
        },
      });

      const response = await get(
        `/sessions/${sessionId}/documents/fit-score/${documentId}`,
        cookie,
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: documentId,
        kind: 'fit-score',
        name: 'First read',
        role: 'Senior Backend Engineer',
        company: 'Moniepoint',
        overall: 86,
        label: 'strong-fit',
        dimensions: {
          requirements: { score: 79, detail: '5 of 7 met, 1 partial' },
          skills: { score: 89, detail: 'Strong overlap' },
          seniority: { score: 85, detail: 'Senior, matches' },
          domain: { score: 100, detail: 'Payments' },
        },
        strengths: ['Six years in payments.'],
        gaps: ['No Kafka.'],
        createdAt: expect.any(String),
      });
    });
  });

  describe('reading', () => {
    it('refuses an unknown kind with a 400', async () => {
      const { cookie } = await onboardedUser();
      const sessionId = await startSession(cookie);
      const resumeId = await createResume(cookie, sessionId);

      const response = await get(
        `/sessions/${sessionId}/documents/essay/${resumeId}`,
        cookie,
      );

      expect(response.status).toBe(400);
    });

    it('returns 404 for a document from another session, kind or user', async () => {
      const { cookie } = await onboardedUser();
      const sessionId = await startSession(cookie);
      const resumeId = await createResume(cookie, sessionId);

      await runTools(cookie, sessionId, [
        { name: 'save_cover_letter', input: coverLetter },
      ]);
      const [letter] = await coverLetters(sessionId);
      const coverLetterId = letter._id.toHexString();

      const otherSessionId = await startSession(cookie);
      const stranger = await onboardedUser('bola@example.com');

      const statuses = await Promise.all(
        [
          [`/sessions/${otherSessionId}/documents/resume/${resumeId}`, cookie],
          [
            `/sessions/${otherSessionId}/documents/cover-letter/${coverLetterId}`,
            cookie,
          ],
          [`/sessions/${sessionId}/documents/cover-letter/${resumeId}`, cookie],
          [`/sessions/${sessionId}/documents/resume/${coverLetterId}`, cookie],
          [
            `/sessions/${sessionId}/documents/resume/${resumeId}`,
            stranger.cookie,
          ],
          [
            `/sessions/${sessionId}/documents/cover-letter/${coverLetterId}`,
            stranger.cookie,
          ],
          [
            `/sessions/${sessionId}/documents/resume/${resumeId}/export?format=pdf`,
            stranger.cookie,
          ],
        ].map(
          async ([path, as]) =>
            (await get(path as string, as as string[])).status,
        ),
      );

      expect(statuses).toEqual([404, 404, 404, 404, 404, 404, 404]);
    });
  });

  describe('exports', () => {
    const exported = async () => {
      const user = await onboardedUser();
      const sessionId = await startSession(user.cookie);
      const resumeId = await createResume(user.cookie, sessionId);

      await runTools(user.cookie, sessionId, [
        { name: 'save_cover_letter', input: coverLetter },
      ]);
      const [letter] = await coverLetters(sessionId);

      return {
        cookie: user.cookie,
        resumePath: `/sessions/${sessionId}/documents/resume/${resumeId}/export`,
        coverLetterPath: `/sessions/${sessionId}/documents/cover-letter/${letter._id.toHexString()}/export`,
        sessionId,
      };
    };

    const pdfText = async (file: Buffer) =>
      (await extractText(new Uint8Array(file), { mergePages: true })).text;

    const docxText = async (file: Buffer) =>
      (await mammoth.extractRawText({ buffer: file })).value;

    it('downloads a resume as a PDF and a DOCX with its content', async () => {
      const { cookie, resumePath } = await exported();

      const pdf = await download(`${resumePath}?format=pdf`, cookie);

      expect(pdf.status).toBe(200);
      expect(pdf.headers['content-type']).toBe('application/pdf');
      expect(pdf.headers['content-disposition']).toBe(
        'attachment; filename="ada-obi-payments-focus.pdf"',
      );

      const docx = await download(`${resumePath}?format=docx`, cookie);

      expect(docx.status).toBe(200);
      expect(docx.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      expect(docx.headers['content-disposition']).toBe(
        'attachment; filename="ada-obi-payments-focus.docx"',
      );

      for (const text of [await pdfText(pdf.body), await docxText(docx.body)]) {
        expect(text).toContain('Ada Obi');
        expect(text).toContain('ada@example.com');
        expect(text).toContain(
          'Payments engineer who ships settlement systems.',
        );
        expect(text).toContain('Backend Engineer, Paystack');
        expect(text).toContain('Mar 2021 – Present');
        expect(text).toContain('Built the settlement service in Go.');
        expect(text).toContain('Go, TypeScript');
      }
    });

    it('downloads a cover letter as a PDF and a DOCX under its header', async () => {
      const { cookie, coverLetterPath } = await exported();

      const pdf = await download(`${coverLetterPath}?format=pdf`, cookie);
      const docx = await download(`${coverLetterPath}?format=docx`, cookie);

      expect(pdf.status).toBe(200);
      expect(docx.status).toBe(200);
      expect(pdf.headers['content-disposition']).toBe(
        'attachment; filename="ada-obi-payments-first-letter.pdf"',
      );

      for (const text of [await pdfText(pdf.body), await docxText(docx.body)]) {
        expect(text).toContain('Ada Obi');
        expect(text).toContain('ada@example.com');
        expect(text).toContain('Dear Moniepoint team,');

        for (const paragraph of coverLetter.paragraphs) {
          expect(text).toContain(paragraph);
        }

        expect(text).toContain('Kind regards,');
      }
    });

    it('renders names in any Latin script', async () => {
      const { cookie } = await onboardedUser();
      const sessionId = await startSession(cookie);
      const name = 'Chídí Ọkọ';

      await runTools(cookie, sessionId, [
        {
          name: 'create_tailored_resume',
          input: {
            name: 'Yoruba name',
            resume: { ...tailoredResume, name },
          },
        },
        {
          name: 'save_cover_letter',
          input: {
            ...coverLetter,
            header: {
              name,
              contact: { email: 'chidi@example.com', links: [] },
            },
          },
        },
      ]);

      const [resume] = await tailoredResumes(sessionId);
      const [letter] = await coverLetters(sessionId);
      const documents = `/sessions/${sessionId}/documents`;

      for (const path of [
        `${documents}/resume/${resume._id.toHexString()}/export`,
        `${documents}/cover-letter/${letter._id.toHexString()}/export`,
      ]) {
        const pdf = await download(`${path}?format=pdf`, cookie);
        const docx = await download(`${path}?format=docx`, cookie);

        for (const text of [
          await pdfText(pdf.body),
          await docxText(docx.body),
        ]) {
          expect(text).toContain(name);
        }
      }
    });

    it('refuses a fit report export and an unknown or missing format with a 400', async () => {
      const { cookie, resumePath, sessionId } = await exported();

      await runTools(cookie, sessionId, [
        { name: 'save_fit_score', input: fitScoreInput },
      ]);
      const fitScore = await getTestDatabase()
        .collection('fit-scores')
        .findOne({ session: new Types.ObjectId(sessionId) });

      const statuses = await Promise.all(
        [
          `/sessions/${sessionId}/documents/fit-score/${fitScore!._id.toHexString()}/export?format=pdf`,
          `${resumePath}?format=txt`,
          resumePath,
          `/sessions/${sessionId}/documents/essay/${fitScore!._id.toHexString()}/export?format=pdf`,
        ].map(async (path) => (await get(path, cookie)).status),
      );

      expect(statuses).toEqual([400, 400, 400, 400]);
    });
  });
});
