import type { UIMessage } from 'ai'
import { DEMO_TIMING } from './demo.constants'
import type { DemoFrame, DemoTurn } from './demo.types'

type Part = UIMessage['parts'][number]

// Words land a couple at a time, as a streamed reply does.
const WORDS_PER_BEAT = 2

// Every moment of the scripted conversation, as the session page would see it stream: each tool
// runs, then settles with its output, then the reply's text streams in.
export function demoFrames(turns: DemoTurn[]): DemoFrame[] {
  const frames: DemoFrame[] = []
  const settled: UIMessage[] = []

  const show = (delay: number, working: boolean, reply?: UIMessage) => {
    frames.push({ delay, working, messages: reply ? [...settled, reply] : [...settled] })
  }

  turns.forEach((turn, turnIndex) => {
    settled.push({ id: `user-${turnIndex}`, role: 'user', parts: [{ type: 'text', text: turn.ask }] })
    show(turnIndex === 0 ? 0 : DEMO_TIMING.pause, true)

    const id = `agent-${turnIndex}`
    let parts: Part[] = []
    const reply = (): UIMessage => ({ id, role: 'assistant', parts })

    turn.reply.forEach((item, itemIndex) => {
      if ('tool' in item) {
        const call = { type: `tool-${item.tool}`, toolCallId: `${turnIndex}-${itemIndex}`, input: {}, toolMetadata: item.display }
        const running = { ...call, state: 'input-available' } as unknown as Part
        const done = { ...call, state: 'output-available', output: item.output } as unknown as Part

        parts = [...parts, running]
        show(DEMO_TIMING.think, true, reply())
        parts = [...parts.slice(0, -1), done]
        show(DEMO_TIMING.tool, true, reply())
        return
      }

      const words = item.text.split(' ')
      const before = parts

      for (let count = WORDS_PER_BEAT; count < words.length; count += WORDS_PER_BEAT) {
        parts = [...before, { type: 'text', text: words.slice(0, count).join(' '), state: 'streaming' }]
        show(count === WORDS_PER_BEAT ? DEMO_TIMING.think : DEMO_TIMING.word, true, reply())
      }

      parts = [...before, { type: 'text', text: item.text, state: 'done' }]
    })

    settled.push(reply())
    show(DEMO_TIMING.word, false)
  })

  return frames
}
