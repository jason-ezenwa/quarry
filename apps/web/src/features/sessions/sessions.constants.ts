import { SESSION_LIMITS, type DocumentKind, type FitLabel, type SessionStatus, type ToolIcon } from '@quarry/contracts'
import { EnvelopeSimpleIcon } from '@phosphor-icons/react/dist/csr/EnvelopeSimple'
import { FileTextIcon } from '@phosphor-icons/react/dist/csr/FileText'
import { GaugeIcon } from '@phosphor-icons/react/dist/csr/Gauge'
import { ClipboardTextIcon } from '@phosphor-icons/react/dist/csr/ClipboardText'
import { FlagCheckeredIcon } from '@phosphor-icons/react/dist/csr/FlagCheckered'
import { GearIcon } from '@phosphor-icons/react/dist/csr/Gear'
import { GlobeIcon } from '@phosphor-icons/react/dist/csr/Globe'
import { ListBulletsIcon } from '@phosphor-icons/react/dist/csr/ListBullets'
import { PencilSimpleIcon } from '@phosphor-icons/react/dist/csr/PencilSimple'
import { PlayIcon } from '@phosphor-icons/react/dist/csr/Play'
import type { IconComponent } from '@/components/session/session.types'
import { PATHS } from '@/lib/auth/auth.constants'
import type { BadgeVariant } from './sessions.types'

// The only icon list the web app keeps, one per icon a tool may name. A stored
// part naming an icon not listed here falls back to the gear.
export const TOOL_ICON_COMPONENTS: Record<ToolIcon, IconComponent> = {
  globe: GlobeIcon,
  gauge: GaugeIcon,
  'file-text': FileTextIcon,
  pencil: PencilSimpleIcon,
  envelope: EnvelopeSimpleIcon,
  play: PlayIcon,
  flag: FlagCheckeredIcon,
  list: ListBulletsIcon,
  clipboard: ClipboardTextIcon,
}

export const FALLBACK_TOOL_STEP = { icon: GearIcon, active: 'Working', done: 'Worked', failed: "Didn't work" } as const

// Shown beside a step that errored or was cut off.
export const UNFINISHED_STEP_NOTE = "Didn't finish"

export const SESSION_STATUS_DISPLAY: Record<SessionStatus, { label: string; variant: BadgeVariant }> = {
  drafting: { label: 'Drafting', variant: 'drafting' },
  ready: { label: 'Ready', variant: 'ready' },
}

// How often an open session asks whether a turn started elsewhere has finished.
export const TURN_POLL_INTERVAL_MS = 3000

export const SESSION_QUERY_KEYS = {
  lists: ['sessions', 'list'] as const,
  list: (archived: boolean) => ['sessions', 'list', { archived }] as const,
  interviewList: ['sessions', 'list', { kind: 'interview' }] as const,
  // An application's interviews, for its Interviews tab.
  applicationInterviews: (sessionId: string) => ['sessions', 'list', 'application-interviews', sessionId] as const,
  detail: (sessionId: string) => ['sessions', 'detail', sessionId] as const,
  // Outside the session's own key, so refreshing the session leaves open documents alone.
  document: (sessionId: string, kind: DocumentKind, documentId: string) =>
    ['documents', sessionId, kind, documentId] as const,
  usage: ['usage'] as const,
}

export const RUNNING_STATES: ReadonlySet<string> = new Set(['input-streaming', 'input-available'])

export const FORM_ERRORS = {
  link: 'Paste a job link that starts with http:// or https://',
  paste: 'Paste the job description',
  tooLong: `Keep the description under ${SESSION_LIMITS.jobDescriptionMaxLength.toLocaleString('en')} characters`,
  failed: "We couldn't start this application. Try again.",
} as const

export const DOT_TONE: Record<FitLabel, string> = {
  'strong-fit': 'bg-success',
  'good-fit': 'bg-warning',
  'weak-fit': 'bg-destructive',
}

export const FIT_TEXT_TONE: Record<FitLabel, string> = {
  'strong-fit': 'text-success-ink',
  'good-fit': 'text-warning-ink',
  'weak-fit': 'text-destructive-ink',
}

export const CRUMBS = [{ label: 'Applications', to: PATHS.applications }]

// Interview tools the web app draws in its own way: a question as the numbered question, the setup in the header.
export const INTERVIEW_TOOLS = { setup: 'setup_interview', ask: 'ask_interview_question' } as const
