import type { Resume } from "@quarry/contracts"
import type { ReactNode } from "react"

// A path into the draft, such as ['experience', 0, 'bullets', 2].
export type ResumeFieldPath = readonly (string | number)[]

export type ResumeEditorState = {
  draft: Resume
}

export type ResumeEditorActions = {
  setField: (path: ResumeFieldPath, value: unknown) => void
  addItem: (path: ResumeFieldPath, item: unknown) => void
  removeItem: (path: ResumeFieldPath, index: number) => void
  moveItem: (path: ResumeFieldPath, from: number, to: number) => void
  save: () => Promise<void>
}

export type ResumeEditorMeta = {
  // Validation messages keyed by the field's path joined with dots.
  errors: Record<string, string>
  saving: boolean
  saveError: string | null
  // Changes whenever an item is removed or moved, so list items keyed by position can remount instead of inheriting a neighbour's state.
  revision: number
}

// The one interface every resume editor implements, whoever holds the draft.
export type ResumeEditorContextValue = {
  state: ResumeEditorState
  actions: ResumeEditorActions
  meta: ResumeEditorMeta
}

// sheet: a page of its own. inset: the same page set inside another sheet, such as a document in the output panel. editor: form sections.
export type ResumeVariant = "sheet" | "inset" | "editor"

export type Draft = Record<string | number, unknown>

export type ResumeEditorProviderProps = {
  resume: Resume
  onSave: (resume: Resume) => Promise<void>
  children: ReactNode
}

export type ResumeEditorFieldProps = Omit<React.ComponentProps<"input">, "value" | "onChange"> & {
  path: ResumeFieldPath
  label: string
  // Visible labels sit above the control; a hidden label still names it for assistive tech.
  hideLabel?: boolean
}

export type ResumeEditorTextAreaProps = Omit<React.ComponentProps<"textarea">, "value" | "onChange"> & {
  path: ResumeFieldPath
  label: string
  hideLabel?: boolean
}

export type ResumeEditorEntryProps = {
  path: ResumeFieldPath
  title: string
  meta?: string
  defaultOpen?: boolean
  children: ReactNode
}
