import type { AnthropicProvider } from '@ai-sdk/anthropic';
import { Inject, Injectable } from '@nestjs/common';
import { interviewFeedbackSchema } from '@quarry/contracts';
import { generateText, NoObjectGeneratedError, Output } from 'ai';
import { ANTHROPIC } from '../../../ai/ai.constants';
import { AGENT_MODEL } from '../../agent/agent.constants';
import {
  FEEDBACK_MAX_OUTPUT_TOKENS,
  FEEDBACK_SYSTEM_PROMPT,
  FEEDBACK_TIMEOUT_MS,
} from './feedback.constants';
import type { FeedbackInput, WrittenFeedback } from './feedback.types';

// Thrown when the model declined or cut the feedback short.
export class FeedbackNotWrittenError extends Error {
  constructor(
    readonly finishReason: string,
    readonly stopReason: string | undefined,
  ) {
    super(`Feedback not written: ${finishReason}`);
    this.name = 'FeedbackNotWrittenError';
  }
}

@Injectable()
export class InterviewFeedbackService {
  constructor(
    @Inject(ANTHROPIC) private readonly anthropic: AnthropicProvider,
  ) {}

  // An answer that doesn't fit the schema is asked for once more.
  async write(input: FeedbackInput): Promise<WrittenFeedback> {
    try {
      return await this.request(input);
    } catch (error) {
      if (
        !NoObjectGeneratedError.isInstance(error) ||
        input.abortSignal?.aborted
      ) {
        throw error;
      }

      return this.request(input);
    }
  }

  private async request({
    context,
    profile,
    questionsAndAnswers,
    abortSignal,
  }: FeedbackInput): Promise<WrittenFeedback> {
    const result = await generateText({
      model: this.anthropic(AGENT_MODEL),
      system: FEEDBACK_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `${context}\n\n${profile}\n\n<interview>\n${JSON.stringify(questionsAndAnswers)}\n</interview>\n\nWrite the feedback on this interview.`,
        },
      ],
      output: Output.object({ schema: interviewFeedbackSchema }),
      maxRetries: 1,
      maxOutputTokens: FEEDBACK_MAX_OUTPUT_TOKENS,
      abortSignal: AbortSignal.any([
        AbortSignal.timeout(FEEDBACK_TIMEOUT_MS),
        ...(abortSignal ? [abortSignal] : []),
      ]),
    });

    if (
      result.finishReason === 'content-filter' ||
      result.finishReason === 'length'
    ) {
      throw new FeedbackNotWrittenError(
        result.finishReason,
        result.rawFinishReason,
      );
    }

    return { feedback: result.output, usage: result.usage };
  }
}
