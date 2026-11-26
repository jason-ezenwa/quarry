import type {
  AskInterviewQuestionOutput,
  CoverLetterDocumentResponse,
  FitScoreDocumentResponse,
  Resume,
  InterviewFeedback,
  InterviewQuestionAndAnswer,
  InterviewState,
} from '@quarry/contracts';
import type { UIMessage } from 'ai';

export type MessagePart = UIMessage['parts'][number];

export type InterviewProgress = {
  totalQuestions?: number;
  questions: string[];
};

export type InterviewContextParts = {
  jobDescription: string;
  resume: Resume;
  coverLetter: CoverLetterDocumentResponse | null;
  fitScore: FitScoreDocumentResponse | null;
};

export type SetupOutcome =
  | { ok: true; totalQuestions: number }
  | { ok: false; reason: 'already-started' | 'interview-ended' };

export type AskOutcome =
  | AskInterviewQuestionOutput
  | {
      ok: false;
      reason: 'not-set-up' | 'last-question-asked' | 'interview-ended';
    };

export type FinishOutcome =
  | { ok: true; interview: InterviewState }
  | {
      ok: false;
      reason: 'interview-ended' | 'nothing-to-review' | 'feedback-failed';
    };

// What list_interviews gives Wren for each interview.
export type ListedInterview = {
  sessionId: string;
  title: string;
  date: string;
  finished: boolean;
  current?: true;
};

// What get_interview gives Wren. Answers are grouped at the end, so an unfinished one has questions only.
export type InterviewRead =
  | {
      title: string;
      startedAt: string;
      finished: false;
      questions: string[];
    }
  | {
      title: string;
      startedAt: string;
      finished: true;
      endedAt: string;
      questionsAndAnswers: InterviewQuestionAndAnswer[];
      feedback: InterviewFeedback | null;
    };
