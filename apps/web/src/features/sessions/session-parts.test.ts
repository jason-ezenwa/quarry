import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import { hasUnansweredMessage, latestDocuments, messageBlocks, replyIsThinking, toolStepFor } from './session-parts'

type ToolPart = Parameters<typeof toolStepFor>[0]

function toolPart(toolCallId: string, output: unknown, state = 'output-available') {
  return { type: 'tool-save', toolCallId, state, input: {}, output } as unknown as UIMessage['parts'][number]
}

function assistant(id: string, parts: UIMessage['parts']): UIMessage {
  return { id, role: 'assistant', parts }
}

describe('latestDocuments', () => {
  it('keeps the newest document of each kind and ignores outputs without a valid document', () => {
    const messages = [
      assistant('a', [
        toolPart('1', { document: { kind: 'fit-score', id: 'fit-1', name: 'First', score: 70, label: 'good-fit' } }),
        toolPart('2', { document: { kind: 'resume', id: 'resume-1', name: 'Resume' } }),
      ]),
      assistant('b', [
        toolPart('3', { document: { kind: 'fit-score', id: 'fit-2', name: 'Second', score: 82, label: 'strong-fit' } }),
        toolPart('4', { document: { kind: 'unknown', id: 'x', name: 'Nope' } }),
        toolPart('5', { ok: false }),
        toolPart('6', undefined, 'input-available'),
      ]),
    ]

    const latest = latestDocuments(messages)

    expect(latest['fit-score']).toMatchObject({ id: 'fit-2', messageId: 'b' })
    expect(latest.resume).toMatchObject({ id: 'resume-1', messageId: 'a' })
    expect(latest['cover-letter']).toBeUndefined()
  })
})

describe('messageBlocks', () => {
  it('groups consecutive tool calls, skips reasoning and hides compaction', () => {
    const blocks = messageBlocks(
      assistant('m', [
        { type: 'step-start' },
        toolPart('1', {}),
        { type: 'reasoning', text: 'thinking' },
        toolPart('2', {}, 'input-streaming'),
        { type: 'text', text: 'Summary of earlier turns', providerMetadata: { anthropic: { type: 'compaction' } } },
        { type: 'text', text: 'Here it is.' },
        toolPart('3', {}),
      ]),
      true,
    )

    expect(blocks.map((block) => (block.kind === 'text' ? block.text : block.kind === 'steps' ? block.steps.map((step) => step.running) : block.kind))).toEqual([
      [false, true],
      'Here it is.',
      [false],
    ])
  })
})

describe('toolStepFor', () => {
  const metadata = { icon: 'globe', active: 'Reading the job', done: 'Read the job', failed: "Couldn't read the job" }

  const step = (state: string, output: unknown = { note: 'Ashby' }) =>
    toolStepFor({ ...toolPart('1', output, state), toolMetadata: metadata } as ToolPart, false)

  it('shows a finished step with its done text and note', () => {
    expect(step('output-available')).toMatchObject({ label: 'Read the job', note: 'Ashby', running: false, unfinished: false })
  })

  it('shows a refused step with its failed text and note, not as unfinished', () => {
    expect(step('output-available', { ok: false, note: 'LinkedIn blocks us' })).toMatchObject({
      label: "Couldn't read the job",
      note: 'LinkedIn blocks us',
      unfinished: false,
    })
  })

  it('marks a step that errored, was denied or was cut off as unfinished', () => {
    for (const state of ['output-error', 'output-denied', 'input-available']) {
      expect(step(state)).toMatchObject({ label: 'Reading the job', note: "Didn't finish", running: false, unfinished: true })
    }
  })
})

describe('hasUnansweredMessage', () => {
  it('is true only when the last message is the user’s', () => {
    const user: UIMessage = { id: 'u', role: 'user', parts: [{ type: 'text', text: 'Hi' }] }
    expect(hasUnansweredMessage([user])).toBe(true)
    expect(hasUnansweredMessage([user, assistant('a', [])])).toBe(false)
    expect(hasUnansweredMessage([])).toBe(false)
  })
})

describe('messageBlocks documents', () => {
  it('puts the documents a run of steps saved right after it, before the text written later', () => {
    const blocks = messageBlocks(
      assistant('m', [
        toolPart('1', { document: { kind: 'resume', id: 'resume-1', name: 'Resume' } }),
        toolPart('2', { document: { kind: 'cover-letter', id: 'letter-1', name: 'Letter' } }),
        { type: 'text', text: 'Both are ready.' },
      ]),
    )

    expect(blocks.map((block) => block.kind)).toEqual(['steps', 'documents', 'text'])
    expect(blocks[1]).toMatchObject({ documents: [{ id: 'resume-1', messageId: 'm' }, { id: 'letter-1', messageId: 'm' }] })
  })
})

describe('replyIsThinking', () => {
  const saved = toolPart('1', { document: { kind: 'resume', id: 'resume-1', name: 'Resume' } })

  it('is true for a live reply whose last step has finished and whose next words have not started', () => {
    expect(replyIsThinking(assistant('m', []), true)).toBe(true)
    expect(replyIsThinking(assistant('m', [saved, { type: 'reasoning', text: 'next' }]), true)).toBe(true)
    expect(replyIsThinking(assistant('m', [{ type: 'text', text: 'Done.', state: 'done' }]), true)).toBe(true)
  })

  it('is false while text streams, a step runs, or the reply has ended', () => {
    expect(replyIsThinking(assistant('m', [saved, { type: 'text', text: 'Here', state: 'streaming' }]), true)).toBe(false)
    expect(replyIsThinking(assistant('m', [toolPart('2', {}, 'input-available')]), true)).toBe(false)
    expect(replyIsThinking(assistant('m', [saved]), false)).toBe(false)
  })
})

describe('messageBlocks: interview questions', () => {
  function askPart(toolCallId: string, question: unknown, output: unknown, state = 'output-available') {
    return { type: 'tool-ask_interview_question', toolCallId, state, input: question === undefined ? undefined : { question }, output } as unknown as UIMessage['parts'][number]
  }

  it('draws an asked question as its own numbered block between the steps and text around it', () => {
    const blocks = messageBlocks(
      assistant('m', [
        toolPart('1', {}),
        askPart('2', 'Tell me about a time you cut scope.', { ok: true, number: 2, totalQuestions: 6 }),
        { type: 'text', text: 'Take your time.' },
      ]),
    )

    expect(blocks.map((block) => block.kind)).toEqual(['steps', 'question', 'text'])
    expect(blocks[1]).toMatchObject({ kind: 'question', id: '2', number: 2, question: 'Tell me about a time you cut scope.' })
  })

  it('shows a question still being written without a number, and leaves out one with no text yet', () => {
    const blocks = messageBlocks(
      assistant('m', [askPart('1', undefined, undefined, 'input-streaming'), askPart('2', 'How would you', undefined, 'input-streaming')]),
      true,
    )

    expect(blocks).toEqual([expect.objectContaining({ kind: 'question', id: '2', number: null, question: 'How would you' })])
  })

  it('keeps a refused or failed question as a tool step', () => {
    const blocks = messageBlocks(
      assistant('m', [
        askPart('1', 'One more?', { ok: false, note: 'That was the last question' }),
        askPart('2', 'Another?', undefined, 'output-error'),
      ]),
    )

    expect(blocks).toEqual([expect.objectContaining({ kind: 'steps', steps: [expect.objectContaining({ id: '1' }), expect.objectContaining({ id: '2' })] })])
  })
})
