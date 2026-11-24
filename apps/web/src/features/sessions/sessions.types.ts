import type { SavedDocumentRef } from '@quarry/contracts'
import type { UIMessage } from 'ai'
import type { VariantProps } from 'class-variance-authority'
import type { badgeVariants } from '@/components/ui/badge'
import type { IconComponent } from '@/components/session/session.types'

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

export type Part = UIMessage['parts'][number]
export type ToolPart = Extract<Part, { toolCallId: string }>

export type Mode = 'link' | 'paste'
