import { useEffect, useState } from 'react'
import type { SessionChatState } from '@/features/sessions/chat/chat.types'
import { DEMO_TIMING } from '../demo.constants'
import type { DemoFrame } from '../demo.types'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const noop = () => {}

// Plays the frames once, then rests on the last. With reduced motion, it starts there.
export function useDemoChat(frames: DemoFrame[]): SessionChatState {
  const [index, setIndex] = useState(() => (prefersReducedMotion() ? frames.length - 1 : 0))
  const last = index >= frames.length - 1

  useEffect(() => {
    if (last) return
    const next = frames[index + 1]
    const timer = window.setTimeout(() => setIndex(index + 1), index === 0 ? DEMO_TIMING.start : next.delay)
    return () => window.clearTimeout(timer)
  }, [frames, index, last])

  const { messages, working } = frames[index]

  return {
    messages,
    busy: working,
    waiting: false,
    error: null,
    unsent: null,
    send: noop,
    retry: noop,
    canStop: working,
    stopping: false,
    stop: async () => {},
  }
}
