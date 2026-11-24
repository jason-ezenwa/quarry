import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'
import type { SessionPageState } from '../chat.types'

function isJustStarted(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as SessionPageState).startTurn === true
}

// Whether the page was opened straight from starting the session, and a way to forget it so a reload doesn't count.
export function useJustStarted(): [justStarted: boolean, forget: () => void] {
  const { pathname, state } = useLocation()
  const navigate = useNavigate()
  const forget = useCallback(() => void navigate(pathname, { replace: true, state: null }), [navigate, pathname])

  return [isJustStarted(state), forget]
}
