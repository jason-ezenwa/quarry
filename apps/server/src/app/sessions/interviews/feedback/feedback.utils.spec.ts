import { interviewFeedbackSchema } from '@quarry/contracts';
import { NoObjectGeneratedError, TypeValidationError } from 'ai';
import { describe, expect, it } from 'vitest';
import { FeedbackNotWrittenError } from './feedback.service';
import { feedbackFailureDetails } from './feedback.utils';

describe('feedbackFailureDetails', () => {
  it('names the schema paths that failed, without their text', () => {
    const value = {
      wentWell: ['Clear structure.'],
      toImprove: ['More numbers.', 'Shorter.'],
      strongerAnswers: [
        { question: 'Q', said: 'S', stronger: 'x'.repeat(4_000) },
      ],
      additionalNotes: '',
    };
    const parsed = interviewFeedbackSchema.safeParse(value);
    const error = new NoObjectGeneratedError({
      message: 'No object generated',
      text: JSON.stringify(value),
      cause: new TypeValidationError({ value, cause: parsed.error }),
      response: { id: 'r', timestamp: new Date(), modelId: 'm' },
      usage: {} as never,
      finishReason: 'stop',
    });

    const details = feedbackFailureDetails(error);

    expect(details).toEqual({
      finishReason: 'stop',
      schemaIssues: [
        'wentWell: too_small',
        'strongerAnswers.0.stronger: too_big',
      ],
    });
    expect(JSON.stringify(details)).not.toContain('Clear structure');
  });

  it('carries the finish and stop reasons of a declined call', () => {
    expect(
      feedbackFailureDetails(
        new FeedbackNotWrittenError('content-filter', 'refusal'),
      ),
    ).toEqual({ finishReason: 'content-filter', stopReason: 'refusal' });
  });

  it('adds nothing for other errors', () => {
    expect(feedbackFailureDetails(new Error('boom'))).toEqual({});
  });
});
