import type {
  InterviewFeedback,
  InterviewQuestionAndAnswer,
} from '@quarry/contracts';
import type { LanguageModelUsage } from 'ai';

export type FeedbackInput = {
  context: string;
  // The profile and primary resume, as the agent reads them.
  profile: string;
  questionsAndAnswers: InterviewQuestionAndAnswer[];
  abortSignal?: AbortSignal;
};

export type WrittenFeedback = {
  feedback: InterviewFeedback;
  usage: LanguageModelUsage;
};
