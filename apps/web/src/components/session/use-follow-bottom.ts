import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { FOLLOW_THRESHOLD_PX } from './session.constants'

function distanceFromBottom(element: HTMLElement): number {
  return element.scrollHeight - element.scrollTop - element.clientHeight
}

// Keeps a scroller at its bottom as its content grows. Scrolling up stops following, and coming back
// within FOLLOW_THRESHOLD_PX of the bottom, or jumpToBottom, follows again.
export function useFollowBottom(scroller: RefObject<HTMLElement | null>, content: RefObject<HTMLElement | null>) {
  const [following, setFollowing] = useState(true)
  const followingRef = useRef(true)
  // Set while a smooth jump runs, so its own scroll events don't stop following.
  const jumping = useRef(false)
  const lastTop = useRef(0)

  const follow = useCallback((next: boolean) => {
    followingRef.current = next
    setFollowing(next)
  }, [])

  // Content that grows while following is pinned before it paints, so a streaming reply never jumps.
  useLayoutEffect(() => {
    const element = scroller.current
    const inner = content.current
    if (!element || !inner) return

    const pin = () => {
      if (followingRef.current && !jumping.current) element.scrollTo({ top: element.scrollHeight })
    }

    // A jump that ends short of a bottom that moved on catches up from there.
    const endJump = () => {
      jumping.current = false
      pin()
    }

    pin()
    const observer = new ResizeObserver(pin)
    observer.observe(inner)
    observer.observe(element)
    element.addEventListener('scrollend', endJump)

    return () => {
      observer.disconnect()
      element.removeEventListener('scrollend', endJump)
    }
  }, [scroller, content])

  const onScroll = useCallback(() => {
    const element = scroller.current
    if (!element) return

    // Only the reader moves scrollTop up. Content growing under a pinned scroller never does.
    const scrolledUp = element.scrollTop < lastTop.current
    lastTop.current = element.scrollTop
    const distance = distanceFromBottom(element)
    const near = distance <= FOLLOW_THRESHOLD_PX

    if (jumping.current) {
      if (near) jumping.current = false
      return
    }

    if (followingRef.current && scrolledUp && distance > 1) follow(false)
    else if (!followingRef.current && near) follow(true)
  }, [scroller, follow])

  const jumpToBottom = useCallback(
    (behavior: ScrollBehavior = 'smooth') => {
      const element = scroller.current
      if (!element) return

      follow(true)
      jumping.current = behavior === 'smooth' && distanceFromBottom(element) > FOLLOW_THRESHOLD_PX
      element.scrollTo({ top: element.scrollHeight, behavior })
    },
    [scroller, follow],
  )

  return { following, onScroll, jumpToBottom }
}
