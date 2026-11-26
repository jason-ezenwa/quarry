import type {
  InterviewFollowUp,
  InterviewQuestionAndAnswer,
} from '@quarry/contracts';
import type { UIMessage } from 'ai';
import { isCompactionPart } from '../sessions.utils';
import { askedQuestion } from './interview-progress';
import type { MessagePart } from './interviews.types';

function textOf(parts: MessagePart[]): string {
  return parts
    .filter(
      (part): part is Extract<MessagePart, { type: 'text' }> =>
        part.type === 'text' && !isCompactionPart(part),
    )
    .map((part) => part.text.trim())
    .filter(Boolean)
    .join('\n\n');
}

function joined(earlier: string, text: string): string {
  return earlier ? `${earlier}\n\n${text}` : text;
}

// Asked questions take the user's next messages as answers; later Wren text
// and its reply are follow-ups. Text beside a question is a transition.
export function groupInterview(
  messages: Pick<UIMessage, 'role' | 'parts'>[],
): InterviewQuestionAndAnswer[] {
  const grouped: InterviewQuestionAndAnswer[] = [];
  let current: InterviewQuestionAndAnswer | null = null;
  // Where the user's next message goes.
  let replyTo: InterviewQuestionAndAnswer | InterviewFollowUp | null = null;
  // Assistant text waiting for the user's reply to become a follow-up.
  let pending: string | null = null;

  for (const message of messages) {
    if (message.role === 'assistant') {
      const questions = message.parts
        .map(askedQuestion)
        .filter((question) => question !== null);

      if (questions.length > 0) {
        for (const question of questions) {
          current = { question, answer: '', followUps: [] };
          grouped.push(current);
        }

        replyTo = current;
        pending = null;
        continue;
      }

      const text = textOf(message.parts);

      if (current && text) {
        replyTo = null;
        pending = text;
      }

      continue;
    }

    const text = textOf(message.parts);
    if (!text) continue;

    if (pending !== null && current) {
      const followUp = { question: pending, answer: '' };
      current.followUps.push(followUp);
      replyTo = followUp;
      pending = null;
    }

    if (replyTo) replyTo.answer = joined(replyTo.answer, text);
  }

  return grouped;
}

export function hasAnswer(grouped: InterviewQuestionAndAnswer[]): boolean {
  return grouped.some(({ answer }) => answer.trim() !== '');
}
