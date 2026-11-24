import type { DocumentKind, SavedDocumentRef } from '@quarry/contracts'
import type { ComponentType, SVGProps } from 'react'
import type { CHAT_ERRORS, SESSION_ERROR_CODES } from './sessions.constants'

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

export type BadgeVariant = 'ready' | 'drafting' | 'interview' | 'neutral'

// One tool call, as the chat draws it.
export type ToolStep = {
  id: string
  icon: IconComponent
  label: string
  meta: string | null
  running: boolean
}

// A run of consecutive parts in one assistant message.
export type MessageBlock = { kind: 'text'; key: string; text: string } | { kind: 'steps'; key: string; steps: ToolStep[] }

// A saved document announced in a tool output, with where it was announced.
export type DocumentAnnouncement = SavedDocumentRef & { messageId: string }

export type OpenDocument = { kind: DocumentKind; id: string }

export type SessionErrorCode = (typeof SESSION_ERROR_CODES)[number]

export type ChatErrorCode = keyof typeof CHAT_ERRORS

// A message the server refused, put back in the composer.
export type UnsentDraft = { text: string; key: string }
