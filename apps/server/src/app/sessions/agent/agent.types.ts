// A running turn: aborting it cancels the call to Claude; `done` settles
// once the turn has released its lock.
export type RunningTurn = {
  messageId: string;
  stop: AbortController;
  done: Promise<void>;
};

// Why a reply wasn't saved. `declined`: Claude's safety checks declined the
// request; `declined-withdrawn`: and the message was taken back.
export type TurnFailure =
  | 'stream-error'
  | 'stopped'
  | 'declined'
  | 'declined-withdrawn'
  | 'empty-reply';
