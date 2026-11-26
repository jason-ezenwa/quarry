import {
  askInterviewQuestionInputSchema,
  setupInterviewInputSchema,
} from '@quarry/contracts';
import { isToolUIPart, type UIMessage } from 'ai';
import { z } from 'zod';
import {
  ASK_QUESTION_TOOL,
  SETUP_INTERVIEW_TOOL,
  TAKEN_TOOL_OUTPUT,
} from './interviews.constants';
import type { InterviewProgress, MessagePart } from './interviews.types';

// A tool call's input, when it ran and the server took it.
function takenInput<T>(
  part: MessagePart,
  tool: string,
  schema: z.ZodType<T>,
): T | null {
  if (
    !isToolUIPart(part) ||
    part.type !== `tool-${tool}` ||
    part.state !== 'output-available' ||
    !TAKEN_TOOL_OUTPUT.safeParse(part.output).success
  ) {
    return null;
  }

  const input = schema.safeParse(part.input);

  return input.success ? input.data : null;
}

// The question an ask_interview_question call put, when the server took it.
export function askedQuestion(part: MessagePart): string | null {
  return (
    takenInput(part, ASK_QUESTION_TOOL, askInterviewQuestionInputSchema)
      ?.question ?? null
  );
}

// From the stored messages: a stopped or failed turn isn't stored, so its questions don't count.
export function progressFrom(
  messages: Pick<UIMessage, 'role' | 'parts'>[],
): InterviewProgress {
  const progress: InterviewProgress = { questions: [] };

  for (const { role, parts } of messages) {
    if (role !== 'assistant') continue;

    for (const part of parts) {
      const setup = takenInput(
        part,
        SETUP_INTERVIEW_TOOL,
        setupInterviewInputSchema,
      );
      if (setup) progress.totalQuestions = setup.totalQuestions;

      const question = askedQuestion(part);
      if (question !== null) progress.questions.push(question);
    }
  }

  return progress;
}

export function numbered(questions: string[]) {
  return questions.map((question, index) => ({ number: index + 1, question }));
}
