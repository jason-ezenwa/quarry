import type { ComponentType, SVGProps } from 'react'

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

// busy: a reply is on its way and can't be stopped yet; stoppable: it streams and can be.
// closed: the session takes no more messages, and the caller says why.
export type ComposerStatus = 'open' | 'busy' | 'stoppable' | 'stopping' | 'closed'

export type ComposerContextValue = {
  state: { text: string; status: ComposerStatus }
  actions: { setText: (text: string) => void; submit: () => void; stop: () => void }
  meta: { canSend: boolean }
}

export type ToolStepsContextValue = {
  state: { running: boolean; open: boolean }
  actions: { toggle: () => void }
  meta: { listId: string }
}

export type ToolStepContextValue = { running: boolean; unfinished: boolean }

export type SessionThreadContextValue = {
  state: { following: boolean }
  actions: { jumpToBottom: (behavior?: ScrollBehavior) => void }
}
