import { createContext, use } from 'react'
import type { ResumeEditorContextValue, ResumeFieldPath } from './resume.types'

export const ResumeEditorContext = createContext<ResumeEditorContextValue | null>(null)

export function useResumeEditor(): ResumeEditorContextValue {
  const context = use(ResumeEditorContext)
  if (!context) throw new Error('Resume editor parts must be inside a ResumeEditorProvider')
  return context
}

export function fieldKey(path: ResumeFieldPath): string {
  return path.join('.')
}
