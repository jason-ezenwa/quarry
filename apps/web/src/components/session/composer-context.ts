import { createContext, use } from 'react'
import type { ComposerContextValue } from './session.types'

export const ComposerContext = createContext<ComposerContextValue | null>(null)

export function useComposer(): ComposerContextValue {
  const context = use(ComposerContext)
  if (!context) throw new Error('Composer parts must be inside a Composer')
  return context
}
