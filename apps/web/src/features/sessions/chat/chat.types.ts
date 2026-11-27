import type { SessionErrorCode } from '@quarry/contracts'
import type { UIMessage } from 'ai'
import type { ComposerStatus } from '@/components/session/session.types'
import type { DocumentAnnouncement } from '../sessions.types'
import type { CHAT_ERRORS } from './chat.constants'

// The server's codes, plus `failed` for anything else.
export type TurnErrorCode = SessionErrorCode | 'failed'

export type ChatErrorCode = keyof typeof CHAT_ERRORS

// A message the server refused, put back in the composer. `declined`: the agent declined to answer it.
export type UnsentDraft = { text: string; key: string; declined?: boolean }

// Router state for a session page. `startTurn`: the session was just started, so the page answers its first message.
export type SessionPageState = { startTurn?: boolean }

// The composer's state, with why it is closed: archived, or at the message limit.
export type ApplicationComposerState = Exclude<ComposerStatus, 'closed'> | 'archived' | 'limit'

export type DocumentCardProps = {
  activeDocumentId: string | null
  onOpenDocument: (document: DocumentAnnouncement) => void
}

// A session's conversation and what can be done to it, as the session page draws it.
export type SessionChatState = {
  messages: UIMessage[]
  busy: boolean
  waiting: boolean
  error: ChatErrorCode | null
  unsent: UnsentDraft | null
  send: (text: string) => void
  retry: () => void
  canStop: boolean
  stopping: boolean
  stop: () => Promise<void>
}
