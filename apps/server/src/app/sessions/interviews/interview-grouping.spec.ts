import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import { groupInterview, hasAnswer } from './interview-grouping';

type Message = Pick<UIMessage, 'role' | 'parts'>;

const user = (text: string): Message => ({
  role: 'user',
  parts: [{ type: 'text', text }],
});

const wren = (text: string): Message => ({
  role: 'assistant',
  parts: [{ type: 'text', text }],
});

const askPart = (question: string, ok = true): UIMessage['parts'][number] => ({
  type: 'tool-ask_interview_question',
  toolCallId: `call-${question}`,
  state: 'output-available',
  input: { question },
  output: ok
    ? { ok: true, number: 1, totalQuestions: 4 }
    : { ok: false, reason: 'not-set-up' },
});

const ask = (question: string, transition?: string): Message => ({
  role: 'assistant',
  parts: [
    ...(transition ? [{ type: 'text' as const, text: transition }] : []),
    askPart(question),
  ],
});

describe('groupInterview', () => {
  it("pairs each question with the user's answer", () => {
    expect(
      groupInterview([
        ask('Tell me about yourself.'),
        user('I build payments systems.'),
        ask('Why this role?'),
        user('It is the work I love.'),
      ]),
    ).toEqual([
      {
        question: 'Tell me about yourself.',
        answer: 'I build payments systems.',
        followUps: [],
      },
      {
        question: 'Why this role?',
        answer: 'It is the work I love.',
        followUps: [],
      },
    ]);
  });

  it('joins consecutive user messages into one answer', () => {
    const [grouped] = groupInterview([
      ask('Tell me about yourself.'),
      user('I build payments systems.'),
      user('Mostly settlement.'),
    ]);

    expect(grouped.answer).toBe(
      'I build payments systems.\n\nMostly settlement.',
    );
  });

  it("makes Wren's text and the user's reply a follow-up", () => {
    const [grouped] = groupInterview([
      ask('Tell me about a hard bug.'),
      user('A race in settlement.'),
      wren('How did you find it?'),
      user('Tracing.'),
      user('And logs.'),
    ]);

    expect(grouped.followUps).toEqual([
      { question: 'How did you find it?', answer: 'Tracing.\n\nAnd logs.' },
    ]);
  });

  it('treats text beside a question as a transition, not a follow-up', () => {
    const grouped = groupInterview([
      ask('First?'),
      user('One.'),
      ask('Second?', 'Thanks, moving on.'),
      user('Two.'),
    ]);

    expect(grouped.map(({ followUps }) => followUps)).toEqual([[], []]);
  });

  it('keeps an unanswered question with an empty answer', () => {
    expect(groupInterview([ask('First?')])).toEqual([
      { question: 'First?', answer: '', followUps: [] },
    ]);
  });

  it('leaves out messages before the first question', () => {
    expect(
      groupInterview([
        user("Let's practise an interview."),
        wren('Hi! What kind of interview is this?'),
        user('A technical round.'),
        ask('First?'),
        user('One.'),
      ]),
    ).toEqual([{ question: 'First?', answer: 'One.', followUps: [] }]);
  });

  it('drops closing text the user never replied to', () => {
    const [grouped] = groupInterview([
      ask('First?'),
      user('One.'),
      wren("That's the interview, thanks."),
    ]);

    expect(grouped.followUps).toEqual([]);
  });

  it('ignores a question the server refused', () => {
    expect(
      groupInterview([
        { role: 'assistant', parts: [askPart('Fifth?', false)] },
      ]),
    ).toEqual([]);
  });
});

describe('hasAnswer', () => {
  it('is false until a question has an answer', () => {
    expect(hasAnswer(groupInterview([ask('First?')]))).toBe(false);
    expect(hasAnswer(groupInterview([ask('First?'), user('One.')]))).toBe(true);
  });
});
