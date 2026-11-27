import { describe, expect, it } from 'vitest'
import { demoFrames } from './demo-script'
import type { DemoTurn } from './demo.types'

const turns: DemoTurn[] = [
  {
    ask: 'Score my fit',
    reply: [
      { tool: 'save_fit_score', display: { icon: 'gauge', active: 'Scoring', done: 'Scored', failed: 'Failed' }, output: { note: '86%' } },
      { text: 'You line up well here.' },
    ],
  },
  { ask: 'Thanks', reply: [{ text: 'Any time.' }] },
]

describe('demoFrames', () => {
  it('runs each tool before it settles, streams the text and ends at rest with the whole conversation', () => {
    const frames = demoFrames(turns)
    const toolStates = frames.flatMap((frame) =>
      frame.messages.flatMap((message) => message.parts.flatMap((part) => ('state' in part && part.type.startsWith('tool-') ? [part.state] : []))),
    )
    const last = frames.at(-1)

    expect(toolStates.indexOf('input-available')).toBeLessThan(toolStates.indexOf('output-available'))
    expect(frames.some((frame) => frame.messages.at(-1)?.parts.some((part) => part.type === 'text' && part.state === 'streaming'))).toBe(true)
    expect(last?.working).toBe(false)
    expect(last?.messages.map((message) => message.role)).toEqual(['user', 'assistant', 'user', 'assistant'])
    expect(last?.messages.at(-1)?.parts).toEqual([{ type: 'text', text: 'Any time.', state: 'done' }])
  })
})
