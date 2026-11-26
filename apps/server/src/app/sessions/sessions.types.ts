import type { SessionKind } from '@quarry/contracts';
import type { SessionContext } from '../common/common.types';
import type { MESSAGE_ROLES } from './sessions.constants';

export type MonthlyPeriod = {
  start: Date;
  resetsAt: Date;
};

// A turn holding the session's lock, identified by its own stamp.
// `messageId`: the user message it answers.
export type ClaimedTurn = SessionContext & {
  kind: SessionKind;
  startedAt: Date;
  messageId: string;
};

// The turn lock, held by a turn or by other work such as ending an interview.
export type ClaimedLock = Pick<ClaimedTurn, 'sessionId' | 'startedAt'>;

export type MessageRole = (typeof MESSAGE_ROLES)[number];
