import { Injectable, Logger } from '@nestjs/common';
import {
  COVER_LETTER_HEADER_DEFAULT,
  coverLetterInputSchema,
  createTailoredResumeInputSchema,
  editTailoredResumeInputSchema,
  FIT_LABEL_TEXT,
  fitScoreInputSchema,
  JOB_SOURCE_LABELS,
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
  ) {}

  build(context: SessionContext): ToolSet {
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
