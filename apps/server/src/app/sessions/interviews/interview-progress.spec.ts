import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import { progressFrom } from './interview-progress';

const toolPart = (
  tool: string,
  input: object,
  output: object,
): UIMessage['parts'][number] => ({
  type: `tool-${tool}`,
  toolCallId: `call-${tool}-${JSON.stringify(input)}`,
  state: 'output-available',
  input,
  output,
});

const wren = (...parts: UIMessage['parts']) => ({
  role: 'assistant' as const,
  parts,
});

describe('progressFrom', () => {
  it('reads the total and the asked questions in order', () => {
    expect(
      progressFrom([
        wren(
          toolPart(
            'setup_interview',
            { title: 'Tech', totalQuestions: 5 },
            { ok: true, totalQuestions: 5 },
          ),
          toolPart(
            'ask_interview_question',
            { question: 'First?' },
            { ok: true, number: 1, totalQuestions: 5 },
          ),
        ),
        { role: 'user', parts: [{ type: 'text', text: 'One.' }] },
        wren(
          toolPart(
            'ask_interview_question',
            { question: 'Second?' },
            { ok: true, number: 2, totalQuestions: 5 },
          ),
        ),
      ]),
    ).toEqual({ totalQuestions: 5, questions: ['First?', 'Second?'] });
  });

  it('leaves out refused calls', () => {
    expect(
      progressFrom([
        wren(
          toolPart(
            'ask_interview_question',
            { question: 'Early?' },
            { ok: false, reason: 'not-set-up' },
          ),
          toolPart(
            'setup_interview',
            { title: 'Tech', totalQuestions: 9 },
            { ok: false, reason: 'already-started' },
          ),
        ),
      ]),
    ).toEqual({ questions: [] });
  });
});
