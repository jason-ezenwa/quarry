import { FIT_LABELS, isDocumentKind, isOneOf, TOOL_ICONS, type DocumentKind, type SavedDocumentRef, type SessionMessage } from '@quarry/contracts'
import { isTextUIPart, isToolUIPart, type UIMessage } from 'ai'
import { FALLBACK_TOOL_STEP, TOOL_ICON_COMPONENTS, UNFINISHED_STEP_NOTE } from './sessions.constants'
import type { DocumentAnnouncement, MessageBlock, ToolStep } from './sessions.types'

type Part = UIMessage['parts'][number]
type ToolPart = Extract<Part, { toolCallId: string }>

const RUNNING_STATES: ReadonlySet<string> = new Set(['input-streaming', 'input-available'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Claude's compaction summary is kept for the model, never drawn.
function isCompaction(part: Part): boolean {
  return isTextUIPart(part) && part.providerMetadata?.anthropic?.type === 'compaction'
}

function displayFor(metadata: ToolPart['toolMetadata']) {
  const { icon, active, done, failed } = metadata ?? {}

  if (!isOneOf(TOOL_ICONS, icon) || typeof active !== 'string' || typeof done !== 'string' || typeof failed !== 'string') {
    return FALLBACK_TOOL_STEP
  }

  return { icon: TOOL_ICON_COMPONENTS[icon], active, done, failed }
}

// Drawn only from the tool's metadata, else the gear. An `ok: false` output shows the failed
// text; only a step that errored or was cut off shows as unfinished.
export function toolStepFor(part: ToolPart, live: boolean): ToolStep {
  const started = RUNNING_STATES.has(part.state)
  const running = started && live
  const unfinished = (started && !live) || part.state === 'output-error' || part.state === 'output-denied'
  const { icon, active, done, failed } = displayFor(part.toolMetadata)
  const output: unknown = part.state === 'output-available' ? part.output : undefined
  const refused = isRecord(output) && output.ok === false
  const note = isRecord(output) && typeof output.note === 'string' ? output.note : null

  return {
    id: part.toolCallId,
    icon,
    label: running || unfinished ? active : refused ? failed : done,
    note: unfinished ? UNFINISHED_STEP_NOTE : note,
    running,
    unfinished,
  }
}

// Text parts become messages; consecutive tool calls share one list of steps.
// Reasoning, step boundaries and anything else are left out. `live`: the reply is still streaming.
export function messageBlocks(message: UIMessage, live = false): MessageBlock[] {
  const blocks: MessageBlock[] = []

  message.parts.forEach((part, index) => {
    if (isTextUIPart(part)) {
      if (!isCompaction(part) && part.text.trim()) {
        blocks.push({ kind: 'text', key: `${message.id}-${index}`, text: part.text })
      }

      return
    }

    if (!isToolUIPart(part)) return

    const last = blocks.at(-1)
    const step = toolStepFor(part, live)
    if (last?.kind === 'steps') last.steps.push(step)
    else blocks.push({ kind: 'steps', key: `${message.id}-${index}`, steps: [step] })
  })

  return blocks
}

// Any tool output carrying a `document` announces a saved document, whatever the tool.
export function documentFrom(part: Part): SavedDocumentRef | null {
  if (!isToolUIPart(part) || part.state !== 'output-available') return null

  const output: unknown = part.output
  if (!isRecord(output) || !isRecord(output.document)) return null

  const { kind, id, name, score, label } = output.document
  if (!isDocumentKind(kind) || typeof id !== 'string' || typeof name !== 'string') return null
  if (kind !== 'fit-score') return { kind, id, name }
  if (typeof score !== 'number' || !isOneOf(FIT_LABELS, label)) return null
  return { kind, id, name, score, label }
}

export function messageDocuments(message: UIMessage): DocumentAnnouncement[] {
  return message.parts.flatMap((part) => {
    const document = documentFrom(part)
    return document ? [{ ...document, messageId: message.id }] : []
  })
}

// The newest document of each kind, which is what each panel tab shows.
export function latestDocuments(messages: UIMessage[]): Partial<Record<DocumentKind, DocumentAnnouncement>> {
  const latest: Partial<Record<DocumentKind, DocumentAnnouncement>> = {}

  for (const message of messages) {
    for (const document of messageDocuments(message)) latest[document.kind] = document
  }

  return latest
}

export function messageText(message: UIMessage): string {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join('')
}

// A user message with no reply yet, such as the first one right after the session is created.
export function hasUnansweredMessage(messages: UIMessage[]): boolean {
  return messages.at(-1)?.role === 'user'
}

// The stored messages are AI SDK UI messages; the contracts type them loosely.
export function asUIMessages(messages: SessionMessage[]): UIMessage[] {
  return messages as UIMessage[]
}
