import { createContext, use } from 'react'
import type { AppFrameContextValue } from './app-frame.types'

export const AppFrameContext = createContext<AppFrameContextValue | null>(null)

export function useAppFrame(): AppFrameContextValue {
  const context = use(AppFrameContext)
  if (!context) throw new Error('App frame parts must be inside the AppLayout')
  return context
}
