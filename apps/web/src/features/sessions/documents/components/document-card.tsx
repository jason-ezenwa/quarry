import {
  OutputCard,
  OutputCardIcon,
  OutputCardMeta,
  OutputCardScore,
  OutputCardText,
  OutputCardTitle,
} from '@/components/session/output-card'
import { DOCUMENT_KIND_DISPLAY, FIT_LABEL_TEXT } from '../documents.constants'
import type { DocumentAnnouncement } from '../../sessions.types'
import { jobLine } from '../../session-format'

// A saved document in the chat. The fit card leads with the score; the others with the kind's icon.
export function DocumentCard({
  document,
  active,
  onOpen,
}: {
  document: DocumentAnnouncement
  active: boolean
  onOpen: () => void
}) {
  const { label, icon } = DOCUMENT_KIND_DISPLAY[document.kind]
  const meta = document.kind === 'fit-score' ? jobLine([FIT_LABEL_TEXT[document.label], document.name]) : document.name

  return (
    <OutputCard active={active} onClick={onOpen} aria-label={`Open ${label.toLowerCase()}: ${document.name}`}>
      {document.kind === 'fit-score' ? <OutputCardScore>{document.score}</OutputCardScore> : <OutputCardIcon icon={icon} />}
      <OutputCardText>
        <OutputCardTitle>{label}</OutputCardTitle>
        <OutputCardMeta>{meta}</OutputCardMeta>
      </OutputCardText>
    </OutputCard>
  )
}
