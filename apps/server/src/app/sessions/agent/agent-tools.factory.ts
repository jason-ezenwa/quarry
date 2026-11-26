import { Injectable, Logger } from '@nestjs/common';
import {
  askInterviewQuestionInputSchema,
  COVER_LETTER_HEADER_DEFAULT,
  coverLetterInputSchema,
  createTailoredResumeInputSchema,
  editTailoredResumeInputSchema,
  FIT_LABEL_TEXT,
  fitScoreInputSchema,
  JOB_SOURCE_LABELS,
  setupInterviewInputSchema,
  type SessionKind,
  type ToolDisplayMetadata,
} from '@quarry/contracts';
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import type { SessionContext } from '../../common/common.types';
import { errorName } from '../../common/error-name';
import { DocumentsService } from '../../documents/documents.service';
import {
  blockedSiteNote,
  JOB_FETCH_FAILURE_NOTES,
} from '../job-fetcher/job-fetcher.constants';
import type { InterviewProgress } from '../interviews/interviews.types';
import { InterviewsService } from '../interviews/interviews.service';
import {
  ASK_QUESTION_TOOL,
  ASK_REFUSALS,
  END_INTERVIEW_TOOL,
  FINISH_REFUSALS,
  GET_INTERVIEW_TOOL,
  INTERVIEW_NOT_FOUND,
  LIST_INTERVIEWS_TOOL,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  SETUP_INTERVIEW_TOOL,
  SETUP_REFUSALS,
} from '../interviews/interviews.constants';
import { SessionsService } from '../sessions.service';
import { SOURCE_NOT_FOUND, TOOL_FAILURE } from './agent.constants';

// The ids come from the signed-in request and are captured here, never
// taken from the model's input. Each tool only calls a service method.
@Injectable()
export class AgentToolsFactory {
  private readonly logger = new Logger(AgentToolsFactory.name);

  constructor(
    private readonly sessionsService: SessionsService,
    private readonly documentsService: DocumentsService,
    private readonly interviewsService: InterviewsService,
  ) {}

  build(context: SessionContext, kind: SessionKind): ToolSet {
    return {
      ...(kind === 'interview'
        ? this.interviewTools(context)
        : this.applicationTools(context)),
      ...this.interviewReadingTools(context),
    };
  }

  private applicationTools(context: SessionContext): ToolSet {
    return {
      get_job_description: tool({
        description:
          "Reads a job post from a link the user gave. Never call it for a pasted description or without a link. Returns the job's text, and its title, company and location when the site gives them. On failure, returns why, so you can ask the user to paste the description.",
        inputSchema: z.object({
          url: z.string().describe('The job post link the user gave'),
        }),
        metadata: {
          icon: 'globe',
          active: 'Reading the job post',
          done: 'Read the job post',
          failed: "Couldn't read the job post",
        } satisfies ToolDisplayMetadata,
        execute: (input, { abortSignal }) =>
          this.guarded(
            context,
            abortSignal,
            'get_job_description',
            async () => {
              const outcome = await this.sessionsService.fetchJob(
                context,
                input.url,
                abortSignal,
              );

              this.logToolCall(context, 'get_job_description', outcome.ok, {
                ...(!outcome.ok && { reason: outcome.reason }),
              });

              if (!outcome.ok) {
                return {
                  ...outcome,
                  askForPaste: true,
                  note:
                    outcome.reason === 'blocked-site'
                      ? blockedSiteNote(outcome.site)
                      : JOB_FETCH_FAILURE_NOTES[outcome.reason],
                };
              }

              const { url: _link, source, ...job } = outcome.job;

              return {
                ok: true,
                source,
                ...job,
                note: JOB_SOURCE_LABELS[source],
              };
            },
          ),
      }),

      save_fit_score: tool({
        description:
          'Saves a fit report for this job. Score each dimension from 0 to 10: requirements (the stated must-haves), skills, seniority and domain. The overall score and label are computed for you.',
        inputSchema: fitScoreInputSchema,
        metadata: {
          icon: 'gauge',
          active: 'Scoring your fit',
          done: 'Scored your fit',
          failed: "Couldn't score your fit",
        } satisfies ToolDisplayMetadata,
        execute: (input, { abortSignal }) =>
          this.guarded(context, abortSignal, 'save_fit_score', async () => {
            const document = await this.documentsService.createFitScore(
              context,
              input,
            );

            await this.sessionsService.nameAfterFitScore(context, input);

            this.logToolCall(context, 'save_fit_score', true);

            return { document, note: `${document.score}%` };
          }),
        // The agent reads the label as the user sees it, "Weak fit", so it
        // never repeats the raw "weak-fit".
        toModelOutput: ({ output }) => ({
          type: 'json',
          value:
            'document' in output
              ? {
                  ...output,
                  document: {
                    ...output.document,
                    label: FIT_LABEL_TEXT[output.document.label],
                  },
                }
              : output,
        }),
      }),

      create_tailored_resume: tool({
        description:
          "Saves a new resume tailored to this job, written whole from the user's primary resume. Use it for the first tailored resume; revise it later with edit_tailored_resume.",
        inputSchema: createTailoredResumeInputSchema,
        metadata: {
          icon: 'file-text',
          active: 'Tailoring your resume',
          done: 'Tailored your resume',
          failed: "Couldn't tailor your resume",
        } satisfies ToolDisplayMetadata,
        execute: (input, { abortSignal }) =>
          this.guarded(
            context,
            abortSignal,
            'create_tailored_resume',
            async () => {
              const document = await this.documentsService.createTailoredResume(
                context,
                input,
              );

              this.logToolCall(context, 'create_tailored_resume', true);

              return { document };
            },
          ),
      }),

      edit_tailored_resume: tool({
        description:
          'Revises a tailored resume from this application. Give only the sections that change, each whole, the name and contact details included; the rest is copied from the source. Saves the result as a new resume and leaves the source as it was. Put every change for one request in one call.',
        inputSchema: editTailoredResumeInputSchema,
        metadata: {
          icon: 'pencil',
          active: 'Editing your resume',
          done: 'Edited your resume',
          failed: "Couldn't edit your resume",
        } satisfies ToolDisplayMetadata,
        execute: (input, { abortSignal }) =>
          this.guarded(
            context,
            abortSignal,
            'edit_tailored_resume',
            async () => {
              const document = await this.documentsService.editTailoredResume(
                context,
                input,
              );

              this.logToolCall(
                context,
                'edit_tailored_resume',
                Boolean(document),
                {
                  ...(!document && { reason: SOURCE_NOT_FOUND.reason }),
                },
              );

              return document ? { document } : SOURCE_NOT_FOUND;
            },
          ),
      }),

      save_cover_letter: tool({
        description: `Saves a cover letter for this job: a greeting, 3 to 5 paragraphs and a sign-off. The name and contact details go above it and below the sign-off for you; give a header only when the user wants different ones on this letter. ${COVER_LETTER_HEADER_DEFAULT} Every save is a new letter.`,
        inputSchema: coverLetterInputSchema,
        metadata: {
          icon: 'envelope',
          active: 'Writing your cover letter',
          done: 'Wrote your cover letter',
          failed: "Couldn't write your cover letter",
        } satisfies ToolDisplayMetadata,
        execute: (input, { abortSignal }) =>
          this.guarded(context, abortSignal, 'save_cover_letter', async () => {
            const document = await this.documentsService.createCoverLetter(
              context,
              input,
            );

            this.logToolCall(context, 'save_cover_letter', true);

            return { document };
          }),
      }),
    };
  }

  // One at a time, so a set-up and its first question sent together land in order.
  private interviewTools(context: SessionContext): ToolSet {
    let queue: Promise<unknown> = Promise.resolve();
    // This turn's own set-up and questions, which aren't stored until it ends.
    const turn: InterviewProgress = { questions: [] };

    const inOrder = <T>(run: () => Promise<T>): Promise<T> => {
      const next = queue.then(run, run);
      queue = next.catch(() => undefined);
      return next;
    };

    return {
      [SETUP_INTERVIEW_TOOL]: tool({
        description: `Sets the interview up once the user has said what kind of interview this is: a short title for it, and how many main questions you will ask (${MIN_QUESTIONS} to ${MAX_QUESTIONS}). Call it before the first question; it can't be changed after.`,
        inputSchema: setupInterviewInputSchema,
        metadata: {
          icon: 'play',
          active: 'Kicking off interview',
          done: 'Kicked off interview',
          failed: "Couldn't kick off the interview",
        } satisfies ToolDisplayMetadata,
        execute: (input, { abortSignal }) =>
          inOrder(() =>
            this.guarded(
              context,
              abortSignal,
              SETUP_INTERVIEW_TOOL,
              async () => {
                const outcome = await this.interviewsService.setup(
                  context,
                  input,
                  turn,
                  abortSignal,
                );

                return outcome.ok ? outcome : SETUP_REFUSALS[outcome.reason];
              },
            ),
          ),
      }),

      [ASK_QUESTION_TOOL]: tool({
        description:
          'Asks the next main interview question. Put the question only here, never in your text: the user sees it as the numbered question, and your turn ends with it, so write nothing about it. Follow-ups and probes are plain messages, not this tool. Questions are numbered for you, and refused once the set number has been asked.',
        inputSchema: askInterviewQuestionInputSchema,
        metadata: {
          icon: 'list',
          active: 'Asking a question',
          done: 'Asked a question',
          failed: "Couldn't ask the question",
        } satisfies ToolDisplayMetadata,
        execute: (input, { abortSignal }) =>
          inOrder(() =>
            this.guarded(context, abortSignal, ASK_QUESTION_TOOL, async () => {
              const outcome = await this.interviewsService.ask(
                context,
                input.question,
                turn,
                abortSignal,
              );

              return outcome.ok ? outcome : ASK_REFUSALS[outcome.reason];
            }),
          ),
      }),

      [END_INTERVIEW_TOOL]: tool({
        description:
          "Ends the interview and writes the user's feedback, which opens beside the chat. Call it after the last question's discussion, or when the user wants to stop. Afterwards, say a short goodbye; don't repeat the feedback.",
        inputSchema: z.object({}),
        metadata: {
          icon: 'flag',
          active: 'Ending interview and writing feedback',
          done: 'Ended interview and wrote feedback',
          failed: "Couldn't end the interview",
        } satisfies ToolDisplayMetadata,
        execute: (_input, { abortSignal }) =>
          inOrder(() =>
            this.guarded(context, abortSignal, END_INTERVIEW_TOOL, async () => {
              const outcome = await this.interviewsService.finish(
                context,
                abortSignal,
              );

              this.logToolCall(context, END_INTERVIEW_TOOL, outcome.ok, {
                ...(!outcome.ok && { reason: outcome.reason }),
              });

              return outcome.ok
                ? { ok: true, ended: true }
                : FINISH_REFUSALS[outcome.reason];
            }),
          ),
      }),
    };
  }

  // In applications and interviews alike: only this job's interviews.
  private interviewReadingTools(context: SessionContext): ToolSet {
    return {
      [LIST_INTERVIEWS_TOOL]: tool({
        description:
          "Lists the user's mock interviews for this job, newest first: each one's title, date, whether it finished, and its session id for get_interview.",
        inputSchema: z.object({}),
        metadata: {
          icon: 'list',
          active: 'Looking at your interviews',
          done: 'Looked at your interviews',
          failed: "Couldn't look at your interviews",
        } satisfies ToolDisplayMetadata,
        execute: (_input, { abortSignal }) =>
          this.guarded(context, abortSignal, LIST_INTERVIEWS_TOOL, async () => {
            const interviews = await this.interviewsService.listFamily(context);

            this.logToolCall(context, LIST_INTERVIEWS_TOOL, true, {
              count: interviews.length,
            });

            return { ok: true, interviews };
          }),
      }),

      [GET_INTERVIEW_TOOL]: tool({
        description:
          'Reads one mock interview for this job by the session id list_interviews gave: a finished one has its questions, answers and feedback; an unfinished one only the questions asked so far.',
        inputSchema: z.object({
          sessionId: z
            .string()
            .describe('The session id of an interview, from list_interviews'),
        }),
        metadata: {
          icon: 'clipboard',
          active: 'Reading your interview',
          done: 'Read your interview',
          failed: "Couldn't read your interview",
        } satisfies ToolDisplayMetadata,
        execute: (input, { abortSignal }) =>
          this.guarded(context, abortSignal, GET_INTERVIEW_TOOL, async () => {
            const interview = await this.interviewsService.readInFamily(
              context,
              input.sessionId,
            );

            this.logToolCall(context, GET_INTERVIEW_TOOL, Boolean(interview), {
              ...(!interview && { reason: INTERVIEW_NOT_FOUND.reason }),
            });

            return interview ? { ok: true, interview } : INTERVIEW_NOT_FOUND;
          }),
      }),
    };
  }

  // A throwing tool answers with a fixed failure, so no internal error text
  // reaches the model, history or browser. After a stop it does nothing.
  private async guarded<T>(
    context: SessionContext,
    abortSignal: AbortSignal | undefined,
    toolName: string,
    run: () => Promise<T>,
  ): Promise<T | typeof TOOL_FAILURE> {
    if (abortSignal?.aborted) {
      this.logToolCall(context, toolName, false, { reason: 'turn-stopped' });
      return TOOL_FAILURE;
    }

    try {
      return await run();
    } catch (error) {
      this.logToolCall(context, toolName, false, {
        reason: 'tool-failed',
        error: errorName(error),
      });

      return TOOL_FAILURE;
    }
  }

  private logToolCall(
    { userId, sessionId }: SessionContext,
    toolName: string,
    ok: boolean,
    extra: Record<string, unknown> = {},
  ): void {
    this.logger.log('Agent tool called', {
      userId,
      sessionId,
      tool: toolName,
      ok,
      ...extra,
    });
  }
}
