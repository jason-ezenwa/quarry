import type { Resume } from '@quarry/contracts'
import type { ReactNode } from 'react'

export type PrimaryResumeEditorProps = {
  resume: Resume
  onSave: (resume: Resume) => Promise<void>
  // The pinned action bar: the variant's buttons, with ResumeEditorSubmit to save.
  actions: ReactNode
  children?: ReactNode
}
