import { UTCDate } from '@date-fns/utc';
import {
  fitLabelFor,
  SESSION_LIMITS,
  type SessionDetail,
  type SessionStatus,
  type SessionSummary,
} from '@quarry/contracts';
import type { UIMessage } from 'ai';
import { addMonths, startOfMonth } from 'date-fns';
import type { CreateSessionDto } from './dto/create-session.dto';
import type { ApplicationSessionDocument } from './session.schema';
import { FIRST_MESSAGE_PREFIX } from './sessions.constants';
import type { MonthlyPeriod } from './sessions.types';

// The UTC calendar month `now` falls in.
export function monthlyPeriod(now: Date): MonthlyPeriod {
  const start = startOfMonth(new UTCDate(now));

  return { start: new Date(start), resetsAt: new Date(addMonths(start, 1)) };
}

// Shown in the chat as the user's own first message.
export function firstMessageText(dto: CreateSessionDto): string {
  return dto.jobDescription !== undefined
    ? `${FIRST_MESSAGE_PREFIX}\n\n${dto.jobDescription}`
    : `${FIRST_MESSAGE_PREFIX} ${dto.jobUrl}`;
}

// Claude's compaction summary goes back to the API but never to the screen.
export function isCompactionPart(part: UIMessage['parts'][number]): boolean {
  return (
    part.type === 'text' &&
    part.providerMetadata?.anthropic?.type === 'compaction'
  );
}

function statusOf(session: ApplicationSessionDocument): SessionStatus {
  return session.turnStartedAt ? 'drafting' : 'ready';
}

export function toSessionSummary(
  session: ApplicationSessionDocument,
  fitOverall: number | null,
): SessionSummary {
  return {
    id: session.id,
    title: session.title,
    company: session.company ?? null,
    source: session.job?.source ?? null,
    fitScore: fitOverall === null ? null : Math.round(fitOverall),
    fitLabel: fitOverall === null ? null : fitLabelFor(fitOverall),
    status: statusOf(session),
    archivedAt: session.archivedAt?.toISOString() ?? null,
    createdAt: session.createdAt.toISOString(),
  };
}

export function toSessionDetail(
  session: ApplicationSessionDocument,
  messages: UIMessage[],
): SessionDetail {
  return {
    id: session.id,
    title: session.title,
    company: session.company ?? null,
    job: {
      url: session.job?.url ?? null,
      source: session.job?.source ?? null,
      location: session.job?.location ?? null,
    },
    status: statusOf(session),
    archivedAt: session.archivedAt?.toISOString() ?? null,
    userMessageCount: session.userMessageCount,
    messageLimit: SESSION_LIMITS.userMessagesPerSession,
    messages: messages.map(({ id, role, parts }) => ({
      id,
      role: role === 'assistant' ? 'assistant' : 'user',
      parts: parts.filter((part) => !isCompactionPart(part)),
    })),
  };
}
