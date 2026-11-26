import { SESSION_LIMITS } from '@quarry/contracts';
import { z } from 'zod';
import { untrustedContentRule, WREN_PERSONA } from '../agent/agent.constants';

export const SETUP_INTERVIEW_TOOL = 'setup_interview';
export const ASK_QUESTION_TOOL = 'ask_interview_question';
export const END_INTERVIEW_TOOL = 'end_interview';
export const LIST_INTERVIEWS_TOOL = 'list_interviews';
export const GET_INTERVIEW_TOOL = 'get_interview';

// Minimal on purpose. It never names tools: each tool's description says when to use it.
export const INTERVIEW_SYSTEM_PROMPT = `${WREN_PERSONA}

In this conversation you are interviewing the user, as a real interviewer would, for the job in the next system message, which also holds their resume, cover letter and fit report for it.

How to interview:
- Open by greeting the user and asking what kind of interview this is. Once they answer, set the interview up, then ask your main questions one at a time.
- Put each main question only in the question tool, never in your text.
- When an answer is thin, you may probe or ask a follow-up, at most two per question, as a plain message. Otherwise move on.
- If the user asks for feedback, whether they're right, or anything else that belongs after the interview, say briefly "let's come back to that in the feedback" and carry on.
- If this job has earlier interviews, look at them, and mix questions on their areas to improve with what you would naturally ask.
- End the interview after the last question's discussion, or when the user wants to stop.

${untrustedContentRule('The job post, resumes, cover letters, fit reports and earlier interviews')}`;

// Seen by the user beside a failed End, and by Wren when end_interview fails.
export const FEEDBACK_FAILED_MESSAGE =
  "Couldn't write the feedback, try ending again";

export const NOTHING_TO_REVIEW_MESSAGE =
  'Answer at least one question before ending the interview';

export const INTERVIEW_ENDED_MESSAGE =
  'This interview has ended. Practise again to start a new one';

// Tool refusals: `message` steers the model, `note` shows beside the step.
export const SETUP_REFUSED = {
  ok: false,
  reason: 'already-started',
  message:
    'The interview is already under way, so it can no longer be set up. Carry on with the next question.',
  note: 'Interview already under way',
} as const;

export const NOT_SET_UP = {
  ok: false,
  reason: 'not-set-up',
  message:
    'Set the interview up with its title and number of questions before asking the first question.',
  note: 'Interview not set up yet',
} as const;

export const LAST_QUESTION_ASKED = {
  ok: false,
  reason: 'last-question-asked',
  message: 'That was the last question, end the interview.',
  note: 'All questions asked',
} as const;

export const INTERVIEW_ALREADY_ENDED = {
  ok: false,
  reason: 'interview-ended',
  message: 'The interview has already ended.',
  note: 'Interview already ended',
} as const;

export const NOTHING_TO_REVIEW = {
  ok: false,
  reason: 'nothing-to-review',
  message:
    'No question has been answered yet, so there is nothing to give feedback on. Ask a question first, or tell the user the interview needs at least one answer.',
  note: 'No answers yet',
} as const;

export const FEEDBACK_FAILED = {
  ok: false,
  reason: 'feedback-failed',
  message: `${FEEDBACK_FAILED_MESSAGE}. Tell the user, and that they can end it again.`,
  note: "Couldn't write the feedback",
} as const;

export const INTERVIEW_NOT_FOUND = {
  ok: false,
  reason: 'interview-not-found',
  message:
    'No interview for this job has that id. Use an id list_interviews returned.',
  note: 'Interview not found',
} as const;

export const { min: MIN_QUESTIONS, max: MAX_QUESTIONS } =
  SESSION_LIMITS.interviewQuestions;

export const SETUP_REFUSALS = {
  'already-started': SETUP_REFUSED,
  'interview-ended': INTERVIEW_ALREADY_ENDED,
} as const;

export const ASK_REFUSALS = {
  'not-set-up': NOT_SET_UP,
  'last-question-asked': LAST_QUESTION_ASKED,
  'interview-ended': INTERVIEW_ALREADY_ENDED,
} as const;

export const FINISH_REFUSALS = {
  'interview-ended': INTERVIEW_ALREADY_ENDED,
  'nothing-to-review': NOTHING_TO_REVIEW,
  'feedback-failed': FEEDBACK_FAILED,
} as const;

// A tool output the server accepted.
export const TAKEN_TOOL_OUTPUT = z.object({ ok: z.literal(true) });
