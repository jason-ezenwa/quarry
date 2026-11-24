// A running turn: aborting it cancels the call to Claude; `done` settles
// once the turn has released its lock.
export type RunningTurn = {
  messageId: string;
  stop: AbortController;
  done: Promise<void>;
};

// Why a reply wasn't saved. `declined-and-withdrawn`: Claude's safety checks
// declined the message and it was taken back; `declined-and-kept`: it was not.
export type TurnFailure =
  | 'stream-error'
  | 'stopped'
  | 'declined-and-kept'
  | 'declined-and-withdrawn'
  | 'empty-reply';
