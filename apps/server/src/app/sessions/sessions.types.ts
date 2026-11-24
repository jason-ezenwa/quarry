import type { SessionContext } from '../common/common.types';

export type MonthlyPeriod = {
  start: Date;
  resetsAt: Date;
};

// A turn holding the session's lock, identified by its own stamp.
export type ClaimedTurn = SessionContext & {
  startedAt: Date;
};
