// A running turn: aborting it cancels the call to Claude; `done` settles
// once the turn has released its lock.
export type RunningTurn = {
  messageId: string;
  stop: AbortController;
  done: Promise<void>;
};
