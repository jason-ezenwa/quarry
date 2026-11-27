import { useEffect, useState } from 'react'
import type { SessionChatState } from '@/features/sessions/chat/chat.types'
import { useMediaQuery } from '@/hooks/use-media-query'
import { DEMO_TIMING } from '../demo.constants'
import type { DemoFrame } from '../demo.types'

const noop = () => {}

// Plays the frames once, then rests on the last. With reduced motion, it shows the last one straight away.
export function useDemoChat(frames: DemoFrame[]): SessionChatState {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [index, setIndex] = useState(0)
  const last = frames.length - 1
  const playing = !reducedMotion && index < last

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => setIndex(index + 1), index === 0 ? DEMO_TIMING.start : frames[index + 1].delay)
    return () => window.clearTimeout(timer)
  }, [frames, index, playing])

  const { messages, working } = frames[reducedMotion ? last : index]

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
