import type { DocumentKind, FitDimension, FitLabel, SessionStatus, ToolIcon } from '@quarry/contracts'
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/csr/EnvelopeSimple'
import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText'
import { GaugeIcon } from '@phosphor-icons/react/dist/csr/Gauge'
import { GearIcon } from '@phosphor-icons/react/dist/csr/Gear'
import { GlobeIcon } from '@phosphor-icons/react/dist/csr/Globe'
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple'
import type { BadgeVariant, IconComponent, TurnErrorCode } from './sessions.types'

// The only icon list the web app keeps, one per icon a tool may name. A stored
// part naming an icon not listed here falls back to the gear.
export const TOOL_ICON_COMPONENTS: Record<ToolIcon, IconComponent> = {
  globe: GlobeIcon,
  gauge: GaugeIcon,
  'file-text': FileTextIcon,
  pencil: PencilSimpleIcon,
  envelope: EnvelopeSimpleIcon,
}

export const FALLBACK_TOOL_STEP = { icon: GearIcon, active: 'Working', done: 'Worked', failed: "Didn't work" } as const

// Shown beside a step that errored or was cut off.
export const UNFINISHED_STEP_NOTE = "Didn't finish"

// The three kinds are the only document list the web app keeps: each picks a
// card's look, the panel tab and the route that fetches it.
export const DOCUMENT_KIND_DISPLAY: Record<DocumentKind, { label: string; icon: IconComponent }> = {
  'fit-score': { label: 'Fit report', icon: GaugeIcon },
  resume: { label: 'Resume', icon: FileTextIcon },
  'cover-letter': { label: 'Cover letter', icon: EnvelopeSimpleIcon },
}

export const FIT_LABEL_TEXT: Record<FitLabel, string> = {
  'strong-fit': 'Strong fit',
  'good-fit': 'Good fit',
  'weak-fit': 'Weak fit',
}

export const FIT_DIMENSION_NAMES: Record<FitDimension, string> = {
  requirements: 'Requirements',
  skills: 'Skills',
  seniority: 'Seniority',
  domain: 'Domain',
}

// What each panel tab says before it has a document.
export const EMPTY_TAB_COPY: Record<DocumentKind, string> = {
  'fit-score': 'Your fit report shows here once it is scored.',
  resume: 'Ask for a tailored resume and it shows here.',
  'cover-letter': 'Ask for a cover letter and it shows here.',
}

export const EXPORT_FAILED_MESSAGE = "We couldn't download it. Try again."

export const SESSION_STATUS_DISPLAY: Record<SessionStatus, { label: string; variant: BadgeVariant }> = {
  drafting: { label: 'Drafting', variant: 'drafting' },
  ready: { label: 'Ready', variant: 'ready' },
}

// How often an open session asks whether a turn started elsewhere has finished.
export const TURN_POLL_INTERVAL_MS = 3000

export const RECENT_SESSIONS_LIMIT = 4
export const HOME_RECENT_SESSIONS_LIMIT = 5

// Turns the server turned away without storing the message.
export const REFUSED_TURN_CODES: ReadonlySet<TurnErrorCode> = new Set<TurnErrorCode>([
  'primary-resume-not-ready',
  'turn-running',
  'session-archived',
  'session-message-limit',
  'nothing-to-answer',
])

// The only turn errors the chat shows; the composer explains the archived and limit states.
export const CHAT_ERRORS = {
  'not-sent': "Your message wasn't sent. Try sending it again.",
  'resume-not-ready': "Your resume is being read or couldn't be read. Check it on the Resume page, then send your message again.",
  failed: 'Something went wrong. Try again.',
} as const

export const SESSION_QUERY_KEYS = {
  lists: ['sessions', 'list'] as const,
  list: (archived: boolean) => ['sessions', 'list', { archived }] as const,
  detail: (sessionId: string) => ['sessions', 'detail', sessionId] as const,
  // Outside the session's own key, so refreshing the session leaves open documents alone.
  document: (sessionId: string, kind: DocumentKind, documentId: string) =>
    ['documents', sessionId, kind, documentId] as const,
  usage: ['usage'] as const,
}
