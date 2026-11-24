import { Injectable, Logger } from '@nestjs/common';
import {
  coverLetterInputSchema,
  createTailoredResumeInputSchema,
  editTailoredResumeInputSchema,
  fitScoreInputSchema,
  type ToolDisplayMetadata,
} from '@quarry/contracts';
import { tool, type ToolSet } from 'ai';
import { z } from 'zod';
import { DocumentsService } from '../../documents/documents.service';
import { SessionsService } from '../sessions.service';
import type { SessionContext } from '../../common/common.types';

const JOB_SOURCE_LABELS = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  workable: 'Workable',
  workday: 'Workday',
  web: 'Web page',
} as const;

const TOOL_FAILURE = {
  ok: false,
  reason: 'tool-failed',
  message:
    'That step failed on our side. Tell the user and suggest trying again.',
} as const;

const SOURCE_NOT_FOUND = {
  ok: false,
  reason: 'source-not-found',
  message:
    'No tailored resume in this application has that id. Use the id of a resume saved in this conversation, or write a new one with create_tailored_resume.',
} as const;

const display = (metadata: ToolDisplayMetadata) => metadata;

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
          "Reads a job post from its link. Returns the job's text, and its title, company and location when the site gives them. On failure, returns why, so you can ask the user to paste the description.",
        inputSchema: z.object({
          url: z.string().describe('The job post link the user gave'),
        }),
        metadata: display({
          icon: 'globe',
          active: 'Reading the job post',
          done: 'Read the job post',
        }),
        execute: (input) =>
          this.guarded(context, 'get_job_description', async () => {
            const outcome = await this.sessionsService.fetchJob(
              context,
              input.url,
            );

            this.logToolCall(context, 'get_job_description', outcome.ok, {
              ...(!outcome.ok && { reason: outcome.reason }),
            });

            if (!outcome.ok) return { ...outcome, askForPaste: true };

            const { url: _link, source, ...job } = outcome.job;

            return {
              ok: true,
              source,
              ...job,
              meta: JOB_SOURCE_LABELS[source],
            };
          }),
      }),

      save_fit_score: tool({
        description:
          'Saves a fit report for this job. Score each dimension from 0 to 10: requirements (the stated must-haves), skills, seniority and domain. The overall score and label are computed for you.',
        inputSchema: fitScoreInputSchema,
        metadata: display({
          icon: 'gauge',
          active: 'Scoring your fit',
          done: 'Scored your fit',
        }),
        execute: (input) =>
          this.guarded(context, 'save_fit_score', async () => {
            const document = await this.sessionsService.saveFitScore(
              context,
              input,
            );

            this.logToolCall(context, 'save_fit_score', true);

            return {
              document,
              meta: document.kind === 'fit-score' ? `${document.score}%` : null,
            };
          }),
      }),

      create_tailored_resume: tool({
        description:
          "Saves a new resume tailored to this job, written whole from the user's primary resume. Use it for the first tailored resume; revise it later with edit_tailored_resume.",
        inputSchema: createTailoredResumeInputSchema,
        metadata: display({
          icon: 'file-text',
          active: 'Tailoring your resume',
          done: 'Tailored your resume',
        }),
        execute: (input) =>
          this.guarded(context, 'create_tailored_resume', async () => {
            const document = await this.documentsService.createTailoredResume(
              context,
              input,
            );

            this.logToolCall(context, 'create_tailored_resume', true);

            return { document };
          }),
      }),

      edit_tailored_resume: tool({
        description:
          'Revises a tailored resume from this application. Give only the sections that change, each whole; the rest is copied from the source. Saves the result as a new resume and leaves the source as it was. Put every change for one request in one call.',
        inputSchema: editTailoredResumeInputSchema,
        metadata: display({
          icon: 'pencil',
          active: 'Editing your resume',
          done: 'Edited your resume',
        }),
        execute: (input) =>
          this.guarded(context, 'edit_tailored_resume', async () => {
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
          }),
      }),

      save_cover_letter: tool({
        description:
          "Saves a cover letter for this job: a greeting, 3 to 5 paragraphs and a sign-off. The user's name and contact details from the primary resume go above it and below the sign-off for you; give a header only when the user wants different ones on this letter. Every save is a new letter.",
        inputSchema: coverLetterInputSchema,
        metadata: display({
          icon: 'envelope',
          active: 'Writing your cover letter',
          done: 'Wrote your cover letter',
        }),
        execute: (input) =>
          this.guarded(context, 'save_cover_letter', async () => {
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

  // A tool that throws answers with a fixed failure instead, so no internal
  // error text reaches the model, the stored history or the browser.
  private async guarded<T>(
    context: SessionContext,
    toolName: string,
    run: () => Promise<T>,
  ): Promise<T | typeof TOOL_FAILURE> {
    try {
      return await run();
    } catch (error) {
      this.logToolCall(context, toolName, false, {
        reason: 'tool-failed',
        error: error instanceof Error ? error.name : 'unknown',
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
