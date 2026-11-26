import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import { interviewProgress } from './interview-progress'

type Part = UIMessage['parts'][number]

function assistant(id: string, parts: unknown[]): UIMessage {
  return { id, role: 'assistant', parts: parts as Part[] }
}

function setup(title: string, totalQuestions: number, output: unknown = { ok: true }, state = 'output-available') {
  return { type: 'tool-setup_interview', toolCallId: `setup-${title}`, state, input: { title, totalQuestions }, output }
}

function ask(id: string, question: string, output?: unknown, state = 'output-available') {
  return { type: 'tool-ask_interview_question', toolCallId: id, state, input: { question }, output }
}

describe('interviewProgress', () => {
  it('is not set up before setup_interview has run', () => {
    expect(interviewProgress([assistant('a', [{ type: 'text', text: 'What kind of interview is this?' }])], { questionCount: 0 })).toEqual({
      title: null,
      total: null,
      asked: 0,
      currentQuestionId: null,
    })
  })

  it('takes the title and total from a setup streamed in this reply, before the session is refetched', () => {
    expect(interviewProgress([assistant('a', [setup('Technical round', 6)])], { questionCount: 0 })).toMatchObject({
      title: 'Technical round',
      total: 6,
      asked: 0,
    })
  })

  it('ignores a refused setup', () => {
    expect(interviewProgress([assistant('a', [setup('Again', 5, { ok: false })])], { questionCount: 0 })).toMatchObject({ title: null, total: null })
  })

  it('counts the latest numbered question and points at the newest question, even one still streaming', () => {
    const messages = [
      assistant('a', [setup('Technical round', 6), ask('q1', 'First?', { ok: true, number: 1, totalQuestions: 6 })]),
      assistant('b', [ask('q2', 'Second?', { ok: true, number: 2, totalQuestions: 6 }), ask('q3', 'Thi', undefined, 'input-streaming')]),
    ]

    expect(interviewProgress(messages, { questionCount: 1, totalQuestions: 6 })).toEqual({
      title: 'Technical round',
      total: 6,
      asked: 2,
      currentQuestionId: 'q3',
    })
  })

  it('reads the stored state on reload when the messages hold no numbers', () => {
    expect(interviewProgress([], { questionCount: 3, totalQuestions: 5 })).toMatchObject({ total: 5, asked: 3 })
  })
})
