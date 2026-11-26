import type { FitLabel } from "./fit-score.js";
import type { InterviewState } from "./interviews.js";

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

// An interview is started from an application, and points at it.
export const SESSION_KINDS = ["application", "interview"] as const;
export type SessionKind = (typeof SESSION_KINDS)[number];

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
  interviewsPerMonth: 10,
  interviewQuestions: { min: 4, max: 8 },
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
  // Sent as a turn stream's error: the session's first message was declined, and is kept.
  "first-message-declined",
  "not-an-application",
  "not-an-interview",
  "application-archived",
  "job-description-missing",
  "monthly-interview-limit",
  "interview-ended",
  // Ending an interview before any question was answered.
  "nothing-to-review",
  "feedback-failed",
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

// The application an interview was started from.
export type SessionParent = {
  id: string;
  title: string;
  company: string | null;
};

// An interview's list-row progress. `totalQuestions` and `endedAt` are absent until set.
export type InterviewSummary = {
  totalQuestions?: number;
  questionCount: number;
  endedAt?: string;
};

export type SessionSummary = {
  id: string;
  kind: SessionKind;
  title: string;
  company: string | null;
  source: JobSource | null;
  // The latest fit report's overall, rounded.
  fitScore: number | null;
  fitLabel: FitLabel | null;
  status: SessionStatus;
  archivedAt: string | null;
  createdAt: string;
  // Interviews only.
  parentSession?: SessionParent;
  interview?: InterviewSummary;
};

// GET /sessions, newest first. `cursor` is the last id of the previous page.
export type ListSessionsQuery = {
  // `application` when left out.
  kind?: SessionKind;
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
  // Whether the job's text was read or pasted; a mock interview needs it.
  hasDescription: boolean;
};

// Messages are AI SDK UI messages; typed loosely so the contracts don't
// depend on the SDK.
export type SessionDetail = {
  id: string;
  kind: SessionKind;
  title: string;
  company: string | null;
  job: SessionJob;
  status: SessionStatus;
  archivedAt: string | null;
  userMessageCount: number;
  messageLimit: number;
  messages: SessionMessage[];
  // Interviews only.
  parentSession?: SessionParent;
  interview?: InterviewState;
};

export type SessionMessage = {
  id: string;
  role: "user" | "assistant";
  parts: object[];
};

export type UsageCount = { used: number; limit: number; resetsAt: string };

export type UsageResponse = {
  sessions: UsageCount;
  interviews: UsageCount;
};

// The 429 body for `monthly-session-limit`.
export type MonthlySessionLimitError = {
  code: "monthly-session-limit";
  message: string;
  used: number;
  limit: number;
  resetsAt: string;
};

// The 429 body for `monthly-interview-limit`.
export type MonthlyInterviewLimitError = {
  code: "monthly-interview-limit";
  message: string;
  used: number;
  limit: number;
  resetsAt: string;
};
