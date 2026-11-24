import { createContext, use } from 'react'
import type { SessionThreadContextValue } from './session.types'

export const SessionThreadContext = createContext<SessionThreadContextValue | null>(null)

export function useSessionThread(): SessionThreadContextValue {
  const context = use(SessionThreadContext)
  if (!context) throw new Error('Session thread parts must be inside a SessionThread')
  return context
}
