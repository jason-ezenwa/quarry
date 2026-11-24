import type { AnthropicProvider } from '@ai-sdk/anthropic';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { resumeSchema } from '@quarry/contracts';
import {
  APICallError,
  generateText,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
  RetryError,
  type UserContent,
} from 'ai';
import mammoth from 'mammoth';
import { Model } from 'mongoose';
import { setTimeout as sleep } from 'node:timers/promises';
import { ANTHROPIC } from '../../ai/ai.constants';
import { StorageObjectNotFoundError } from '../../storage/storage-bucket';
import { StorageService } from '../../storage/storage.service';
import {
  PARSE_MAX_OUTPUT_TOKENS,
  PARSE_RETRY_DELAYS_MS,
  PARSE_TIMEOUT_MS,
  RESUME_PARSE_MODEL,
  RESUME_PARSE_SYSTEM_PROMPT,
} from './parser.constants';
import type {
  ParseFailureReason,
  ParseLogContext,
  ParseResult,
} from './parser.types';
import {
  Resume,
  ResumeDocument,
  ResumeFile,
  ResumeParseUsage,
} from '../resume.schema';
import { toResumeContentUpdate } from '../resume.utils';

class ParseAttemptError extends Error {
  constructor(readonly reason: ParseFailureReason) {
    super(reason);
  }
}

// Logs carry ids, the model, token counts and failure reasons only: never
// resume content, file contents or request and response bodies.
@Injectable()
export class ResumeParserService {
  private readonly logger = new Logger(ResumeParserService.name);

  constructor(
    @InjectModel(Resume.name)
    private readonly resumeModel: Model<ResumeDocument>,
    private readonly storageService: StorageService,
    @Inject(ANTHROPIC) private readonly anthropic: AnthropicProvider,
    @Inject(PARSE_RETRY_DELAYS_MS) private readonly retryDelaysMs: number[],
  ) {}

  // The claim is parseStartedAt at the start; a parse whose claim has been
  // replaced (retry, re-upload, recovery) has its result dropped.
  async parse(resumeId: string): Promise<void> {
    const resume = await this.resumeModel.findById(resumeId);
    if (resume?.parseStatus !== 'parsing' || !resume.file) return;

    const claim = resume.parseStartedAt;

    const context: ParseLogContext = {
      resumeId,
      userId: resume.user.toHexString(),
      model: RESUME_PARSE_MODEL,
    };

    const startedAt = Date.now();
    this.logger.log('Resume parse started', context);

    const outcome = await this.attemptWithRetries(resume.file, context);

    if ('reason' in outcome) {
      await this.markFailed(resumeId, claim, outcome.reason);

      this.logger.warn('Resume parse failed', {
        ...context,
        reason: outcome.reason,
        durationMs: Date.now() - startedAt,
      });

      return;
    }

    const stored = await this.markParsed(resumeId, claim, outcome.result);

    this.logger.log(stored ? 'Resume parsed' : 'Resume parse superseded', {
      ...context,
      inputTokens: outcome.result.usage.inputTokens,
      outputTokens: outcome.result.usage.outputTokens,
      durationMs: Date.now() - startedAt,
    });
  }

  // An unreadable file fails at once; anything else is retried.
  private async attemptWithRetries(
    file: ResumeFile,
    context: ParseLogContext,
  ): Promise<{ result: ParseResult } | { reason: ParseFailureReason }> {
    const attempts = this.retryDelaysMs.length + 1;
    let content: UserContent | undefined;

    for (let attempt = 1; ; attempt++) {
      try {
        // Built on the first attempt only; retries reuse it.
        content ??= await this.buildContent(file);

        return { result: await this.requestParse(content) };
      } catch (error) {
        const reason = this.reasonFor(error);

        this.logger.warn('Resume parse attempt failed', {
          ...context,
          attempt,
          reason,
        });

        if (reason === 'unreadable-file' || attempt === attempts) {
          return { reason };
        }

        await sleep(this.retryDelaysMs[attempt - 1]);
      }
    }
  }

  private async buildContent({
    path,
    mimeType,
  }: ResumeFile): Promise<UserContent> {
    const data = await this.read(path);
    const instruction = { type: 'text' as const, text: 'Extract this resume.' };

    if (mimeType === 'application/pdf') {
      return [
        { type: 'file', data, mediaType: 'application/pdf' },
        instruction,
      ];
    }

    let text: string;

    try {
      ({ value: text } = await mammoth.extractRawText({ buffer: data }));
    } catch {
      throw new ParseAttemptError('unreadable-file');
    }

    if (!text.trim()) throw new ParseAttemptError('unreadable-file');

    return [
      instruction,
      { type: 'text', text: `<resume>\n${text}\n</resume>` },
    ];
  }

  private async read(path: string): Promise<Buffer> {
    try {
      return await this.storageService.read(path);
    } catch (error) {
      throw new ParseAttemptError(
        error instanceof StorageObjectNotFoundError
          ? 'unreadable-file'
          : 'storage-error',
      );
    }
  }

  private async requestParse(content: UserContent): Promise<ParseResult> {
    const result = await generateText({
      model: this.anthropic(RESUME_PARSE_MODEL),
      system: RESUME_PARSE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content }],
      output: Output.object({ schema: resumeSchema }),
      // attemptWithRetries() is the only retry policy.
      maxRetries: 0,
      // A full resume fits well within this; a runaway reply fails fast.
      maxOutputTokens: PARSE_MAX_OUTPUT_TOKENS,
      abortSignal: AbortSignal.timeout(PARSE_TIMEOUT_MS),
    });

    if (result.finishReason === 'content-filter') {
      throw new ParseAttemptError('refused');
    }

    if (result.finishReason === 'length') {
      throw new ParseAttemptError('invalid-output');
    }

    const usage = new ResumeParseUsage();
    usage.model = RESUME_PARSE_MODEL;
    usage.inputTokens = result.usage.inputTokens ?? 0;
    usage.outputTokens = result.usage.outputTokens ?? 0;

    return { content: result.output, usage };
  }

  private reasonFor(error: unknown): ParseFailureReason {
    const cause = RetryError.isInstance(error) ? error.lastError : error;

    if (cause instanceof ParseAttemptError) return cause.reason;

    if (
      cause instanceof Error &&
      (cause.name === 'TimeoutError' || cause.name === 'AbortError')
    ) {
      return 'timeout';
    }

    if (APICallError.isInstance(cause)) return 'api-error';

    if (
      NoObjectGeneratedError.isInstance(cause) ||
      NoOutputGeneratedError.isInstance(cause)
    ) {
      return 'invalid-output';
    }

    return 'api-error';
  }

  private async markParsed(
    resumeId: string,
    claim: Date | undefined,
    { content, usage }: ParseResult,
  ): Promise<boolean> {
    const result = await this.resumeModel.updateOne(
      { _id: resumeId, parseStatus: 'parsing', parseStartedAt: claim },
      toResumeContentUpdate(content, {
        parseStatus: 'parsed',
        parsedAt: new Date(),
        parseError: null,
        parseUsage: usage,
      }),
    );

    return result.modifiedCount === 1;
  }

  private async markFailed(
    resumeId: string,
    claim: Date | undefined,
    reason: ParseFailureReason,
  ): Promise<void> {
    await this.resumeModel.updateOne(
      { _id: resumeId, parseStatus: 'parsing', parseStartedAt: claim },
      { $set: { parseStatus: 'failed', parseError: reason } },
    );
  }
}
