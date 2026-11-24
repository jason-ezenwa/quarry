import type { DocumentKind, SavedDocumentRef, SessionErrorCode } from '@quarry/contracts'
import type { VariantProps } from 'class-variance-authority'
import type { ComponentType, SVGProps } from 'react'
import type { badgeVariants } from '@/components/ui/badge'
import type { CHAT_ERRORS } from './sessions.constants'

export type IconComponent = ComponentType<SVGProps<SVGSVGElement>>

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>

// One tool call, as the chat draws it.
export type ToolStep = {
  id: string
  icon: IconComponent
  label: string
  note: string | null
  running: boolean
  // Errored, or cut off when its reply stopped.
  unfinished: boolean
}

// A run of consecutive parts in one assistant message.
export type MessageBlock = { kind: 'text'; key: string; text: string } | { kind: 'steps'; key: string; steps: ToolStep[] }

// A saved document announced in a tool output, with where it was announced.
export type DocumentAnnouncement = SavedDocumentRef & { messageId: string }

export type OpenDocument = { kind: DocumentKind; id: string }

// The server's codes, plus `failed` for anything else.
export type TurnErrorCode = SessionErrorCode | 'failed'

export type ChatErrorCode = keyof typeof CHAT_ERRORS

// A message the server refused, put back in the composer.
export type UnsentDraft = { text: string; key: string }
