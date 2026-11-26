import type {
  InterviewFeedback,
  InterviewState,
  InterviewSummary,
} from '@quarry/contracts';
import type { StopCondition, ToolSet } from 'ai';
import type { Types } from 'mongoose';
import type { AgentSession } from '../session.schema';
import type { Interview } from './interview.schema';
import { ASK_QUESTION_TOOL } from './interviews.constants';
import type { InterviewContextParts } from './interviews.types';

// The interview's second system message, rendered once when it starts.
export function renderInterviewContext({
  jobDescription,
  resume,
  coverLetter,
  fitScore,
}: InterviewContextParts): string {
  const sections = [
    `<job-description>\n${jobDescription}\n</job-description>`,
    `<resume>\n${JSON.stringify(resume)}\n</resume>`,
  ];

  if (coverLetter) {
    const { greeting, paragraphs, signOff } = coverLetter;

    sections.push(
      `<cover-letter>\n${[greeting, ...paragraphs, signOff].join('\n\n')}\n</cover-letter>`,
    );
  }

  if (fitScore) {
    const { role, company, overall, label, dimensions, strengths, gaps } =
      fitScore;

    sections.push(
      `<fit-report>\n${JSON.stringify({ role, company, overall, label, dimensions, strengths, gaps })}\n</fit-report>`,
    );
  }

  return sections.join('\n\n');
}

// An application and its interviews share one family: the application's id.
export function familyId(
  session: Pick<AgentSession, 'parentSession'> & { _id: Types.ObjectId },
): Types.ObjectId {
  return session.parentSession ?? session._id;
}

export function toFeedback({
  wentWell,
  toImprove,
  strongerAnswers,
  additionalNotes,
}: NonNullable<Interview['feedback']>): InterviewFeedback {
  return {
    wentWell: [...wentWell],
    toImprove: [...toImprove],
    strongerAnswers: strongerAnswers.map(({ question, said, stronger }) => ({
      question,
      said,
      stronger,
    })),
    additionalNotes,
  };
}

export function toInterviewSummary(interview: Interview): InterviewSummary {
  return {
    ...(interview.totalQuestions !== undefined && {
      totalQuestions: interview.totalQuestions,
    }),
    questionCount: interview.questions.length,
    ...(interview.endedAt && { endedAt: interview.endedAt.toISOString() }),
  };
}

export function toInterviewState(interview: Interview): InterviewState {
  return {
    ...toInterviewSummary(interview),
    ...(interview.feedback && { feedback: toFeedback(interview.feedback) }),
  };
}

// Ends the turn once a question is asked, so the question is the last thing the candidate sees.
export const stopAfterInterviewQuestion: StopCondition<ToolSet> = ({ steps }) =>
  steps
    .at(-1)
    ?.toolResults.some(
      ({ toolName, output }) =>
        toolName === ASK_QUESTION_TOOL &&
        typeof output === 'object' &&
        output !== null &&
        'ok' in output &&
        output.ok === true,
    ) ?? false;
