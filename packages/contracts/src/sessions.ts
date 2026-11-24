import type { FitLabel } from "./fit-score.js";

// Where a session's job description came from.
export const JOB_SOURCES = [
  "greenhouse",
  "lever",
  "ashby",
  "workable",
  "workday",
  "web",
  "pasted",
] as const;

export type JobSource = (typeof JOB_SOURCES)[number];

// How a source reads beside a job, in lists and in the tool step.
export const JOB_SOURCE_LABELS: Record<JobSource, string> = {
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  workable: "Workable",
  workday: "Workday",
  web: "Web",
  pasted: "Pasted",
};

// Sites that block automated access, so the job tool never tries them.
export const BLOCKED_JOB_SITES = ["linkedin", "glassdoor", "indeed"] as const;
export type BlockedJobSite = (typeof BLOCKED_JOB_SITES)[number];

// `drafting` while a turn runs.
export const SESSION_STATUSES = ["drafting", "ready"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_LIMITS = {
  sessionsPerMonth: 10,
  userMessagesPerSession: 40,
  jobDescriptionMaxLength: 30_000,
  turnMessageMaxLength: 30_000,
  messageIdMaxLength: 100,
  sessionsPageSize: 20,
  sessionsPageMaxSize: 50,
} as const;

export const SESSION_ERROR_CODES = [
  "primary-resume-not-ready",
  "monthly-session-limit",
  "turn-running",
  "session-archived",
  "session-message-limit",
  "nothing-to-answer",
  // Sent as a turn stream's error: the message was declined and taken back.
  "reply-declined",
] as const;

export type SessionErrorCode = (typeof SESSION_ERROR_CODES)[number];

// Exactly one of the two.
export type CreateSessionRequest =
  | { jobUrl: string; jobDescription?: never }
  | { jobDescription: string; jobUrl?: never };

export type CreateSessionResponse = { id: string };

export type RunTurnRequest = {
  message?: { id: string; text: string };
};

export type UpdateSessionRequest = { archived: boolean };

export type SessionSummary = {
  id: string;
  title: string;
  company: string | null;
  source: JobSource | null;
  // The latest fit report's overall, rounded.
  fitScore: number | null;
  fitLabel: FitLabel | null;
  status: SessionStatus;
  archivedAt: string | null;
  createdAt: string;
};

// GET /sessions, newest first. `cursor` is the last id of the previous page.
export type ListSessionsQuery = {
  archived?: boolean;
  cursor?: string;
  limit?: number;
};

export type SessionPage = {
  items: SessionSummary[];
  // Null on the last page.
  nextCursor: string | null;
};

export type SessionJob = {
  url: string | null;
  source: JobSource | null;
  location: string | null;
};

// Messages are AI SDK UI messages; typed loosely so the contracts don't
// depend on the SDK.
export type SessionDetail = {
  id: string;
  title: string;
  company: string | null;
  job: SessionJob;
  status: SessionStatus;
  archivedAt: string | null;
  userMessageCount: number;
  messageLimit: number;
  messages: SessionMessage[];
};

export type SessionMessage = {
  id: string;
  role: "user" | "assistant";
  parts: object[];
};

export type UsageResponse = {
  sessions: { used: number; limit: number; resetsAt: string };
};

// The 429 body for `monthly-session-limit`.
export type MonthlySessionLimitError = {
  code: "monthly-session-limit";
  message: string;
  used: number;
  limit: number;
  resetsAt: string;
};
