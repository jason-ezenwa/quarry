import type { Resume } from '@quarry/contracts'
import { createContext, use } from 'react'

// A path into the draft, such as ['experience', 0, 'bullets', 2].
export type ResumeFieldPath = readonly (string | number)[]

export type ResumeEditorState = {
  draft: Resume
}

export type ResumeEditorActions = {
  setField: (path: ResumeFieldPath, value: unknown) => void
  addItem: (path: ResumeFieldPath, item: unknown) => void
  removeItem: (path: ResumeFieldPath, index: number) => void
  save: () => Promise<void>
}

export type ResumeEditorMeta = {
  // Validation messages keyed by the field's path joined with dots.
  errors: Record<string, string>
  saving: boolean
  saveError: string | null
}

// The one interface every resume editor implements, whoever holds the draft.
export type ResumeEditorContextValue = {
  state: ResumeEditorState
  actions: ResumeEditorActions
  meta: ResumeEditorMeta
}

export const ResumeEditorContext = createContext<ResumeEditorContextValue | null>(null)

export function useResumeEditor(): ResumeEditorContextValue {
  const context = use(ResumeEditorContext)
  if (!context) throw new Error('Resume editor parts must be inside a ResumeEditorProvider')
  return context
}

export function fieldKey(path: ResumeFieldPath): string {
  return path.join('.')
}
