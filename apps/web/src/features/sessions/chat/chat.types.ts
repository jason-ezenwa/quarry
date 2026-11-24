import type { SessionErrorCode } from '@quarry/contracts'
import type { ComposerStatus } from '@/components/session/session.types'
import type { DocumentAnnouncement } from '../sessions.types'
import type { CHAT_ERRORS } from './chat.constants'

// The server's codes, plus `failed` for anything else.
export type TurnErrorCode = SessionErrorCode | 'failed'

export type ChatErrorCode = keyof typeof CHAT_ERRORS

// A message the server refused, put back in the composer.
export type UnsentDraft = { text: string; key: string }

// The composer's state, with why it is closed: archived, or at the message limit.
export type ApplicationComposerState = Exclude<ComposerStatus, 'closed'> | 'archived' | 'limit'

export type DocumentCardProps = {
  activeDocumentId: string | null
  onOpenDocument: (document: DocumentAnnouncement) => void
}
