import type { DocumentKind, FitDimension, FitLabel, JobSource, SessionStatus } from '@quarry/contracts'
import { ArrowsDownUpIcon } from '@phosphor-icons/react/dist/csr/ArrowsDownUp'
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/csr/EnvelopeSimple'
import { FilePdfIcon } from '@phosphor-icons/react/dist/csr/FilePdf'
import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText'
import { GaugeIcon } from '@phosphor-icons/react/dist/csr/Gauge'
import { GearIcon } from '@phosphor-icons/react/dist/csr/Gear'
import { GlobeIcon } from '@phosphor-icons/react/dist/csr/Globe'
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple'
import { ScissorsIcon } from '@phosphor-icons/react/dist/csr/Scissors'
import type { BadgeVariant, IconComponent, SessionErrorCode } from './sessions.types'

// The only icon list the web app keeps. Tools name an icon in their metadata;
// a name not listed here falls back to the gear.
export const TOOL_ICONS: Record<string, IconComponent> = {
  globe: GlobeIcon,
  gauge: GaugeIcon,
  'file-text': FileTextIcon,
  'envelope-simple': EnvelopeSimpleIcon,
  'file-pdf': FilePdfIcon,
  'arrows-down-up': ArrowsDownUpIcon,
  scissors: ScissorsIcon,
  'pencil-simple': PencilSimpleIcon,
}

export const FALLBACK_TOOL_STEP = { icon: GearIcon, active: 'Working', done: 'Worked' } as const

// Shown beside a step that errored or was cut off.
export const UNFINISHED_STEP_META = "Didn't finish"

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

export const JOB_SOURCE_LABELS: Record<JobSource, string> = {
  greenhouse: 'Greenhouse',
  lever: 'Lever',
  ashby: 'Ashby',
  workable: 'Workable',
  workday: 'Workday',
  web: 'Web',
  pasted: 'Pasted',
}

// What each panel tab says before it has a document.
export const EMPTY_TAB_COPY: Record<DocumentKind, string> = {
  'fit-score': 'Your fit report shows here once it is scored.',
  resume: 'Ask for a tailored resume and it shows here.',
  'cover-letter': 'Ask for a cover letter and it shows here.',
}

export const SESSION_STATUS_DISPLAY: Record<SessionStatus, { label: string; variant: BadgeVariant }> = {
  drafting: { label: 'Drafting', variant: 'drafting' },
  ready: { label: 'Ready', variant: 'ready' },
}

// How often an open session asks whether a turn started elsewhere has finished.
export const TURN_POLL_INTERVAL_MS = 3000

export const RECENT_SESSIONS_LIMIT = 4
export const HOME_RECENT_SESSIONS_LIMIT = 5

// Turns the server turned away without storing the message.
export const REFUSED_TURN_CODES: ReadonlySet<SessionErrorCode> = new Set<SessionErrorCode>([
  'turn-running',
  'session-archived',
  'session-message-limit',
  'nothing-to-answer',
])

// The turn error codes the server sends; any other failure counts as 'failed'.
export const SESSION_ERROR_CODES = [
  'primary-resume-not-ready',
  'turn-running',
  'session-archived',
  'session-message-limit',
  'nothing-to-answer',
  'failed',
] as const

// The only turn errors the chat shows; the composer explains the archived and limit states.
export const CHAT_ERRORS = {
  'not-sent': "Your message wasn't sent. Try sending it again.",
  failed: 'Something went wrong. Try again.',
} as const

export const SESSION_QUERY_KEYS = {
  lists: ['sessions', 'list'] as const,
  list: (archived: boolean) => ['sessions', 'list', { archived }] as const,
  detail: (sessionId: string) => ['sessions', 'detail', sessionId] as const,
  document: (sessionId: string, kind: DocumentKind, documentId: string) =>
    ['sessions', 'detail', sessionId, 'documents', kind, documentId] as const,
  usage: ['usage'] as const,
}
