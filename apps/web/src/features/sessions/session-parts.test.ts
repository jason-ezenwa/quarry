import type { UIMessage } from 'ai'
import { describe, expect, it } from 'vitest'
import { hasUnansweredMessage, latestDocuments, messageBlocks, toolStepFor } from './session-parts'

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

    expect(blocks.map((block) => (block.kind === 'text' ? block.text : block.steps.map((step) => step.running)))).toEqual([
      [false, true],
      'Here it is.',
      [false],
    ])
  })
})

describe('toolStepFor', () => {
  const metadata = { icon: 'globe', active: 'Reading the job', done: 'Read the job' }
  const step = (state: string) => toolStepFor({ ...toolPart('1', { meta: 'ashby.com' }, state), toolMetadata: metadata } as ToolPart, false)

  it('shows a finished step with its done text and meta', () => {
    expect(step('output-available')).toMatchObject({ label: 'Read the job', meta: 'ashby.com', running: false })
  })

  it('marks a step that errored, was denied or was cut off as unfinished', () => {
    for (const state of ['output-error', 'output-denied', 'input-available']) {
      expect(step(state)).toMatchObject({ label: 'Reading the job', meta: "Didn't finish", running: false })
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
