import { NoObjectGeneratedError } from 'ai';
import { FeedbackNotWrittenError } from './feedback.service';

type SchemaIssue = { path: PropertyKey[]; code: string };

// Paths and codes only, so the log carries none of the feedback's text.
function schemaIssues(error: unknown): string[] | undefined {
  for (let cause = error; cause instanceof Error; cause = cause.cause) {
    if ('issues' in cause && Array.isArray(cause.issues)) {
      return (cause.issues as SchemaIssue[]).map(
        ({ path, code }) => `${path.map(String).join('.')}: ${code}`,
      );
    }
  }

  return undefined;
}

// Why the feedback call failed, for the log.
export function feedbackFailureDetails(error: unknown) {
  if (error instanceof FeedbackNotWrittenError) {
    return { finishReason: error.finishReason, stopReason: error.stopReason };
  }

  if (NoObjectGeneratedError.isInstance(error)) {
    return {
      finishReason: error.finishReason,
      schemaIssues: schemaIssues(error.cause),
    };
  }

  return {};
}
