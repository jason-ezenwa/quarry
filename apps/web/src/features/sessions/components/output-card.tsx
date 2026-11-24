import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight'
import { cn } from '@/lib/utils'
import { DOCUMENT_KIND_DISPLAY, FIT_LABEL_TEXT } from '../sessions.constants'
import type { DocumentAnnouncement } from '../sessions.types'
import { jobLine } from '../session-format'

// A saved document in the chat. The fit card leads with the score; the others with the kind's icon.
export function OutputCard({
  document,
  active,
  onOpen,
}: {
  document: DocumentAnnouncement
  active: boolean
  onOpen: () => void
}) {
  const { label, icon: KindIcon } = DOCUMENT_KIND_DISPLAY[document.kind]
  const meta = document.kind === 'fit-score' ? jobLine([FIT_LABEL_TEXT[document.label], document.name]) : document.name

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={active}
      aria-label={`Open ${label.toLowerCase()}: ${document.name}`}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg bg-card py-2.5 pr-3 pl-2.5 text-left ring-1 ring-border transition-shadow hover:ring-border-strong md:max-w-90',
        active && 'ring-foreground hover:ring-foreground',
      )}
    >
      {document.kind === 'fit-score' ? (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-fit text-tile text-fit-foreground">
          {document.score}
        </span>
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <KindIcon aria-hidden="true" className="size-4.5" />
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-ui-strong">{label}</span>
        <span className="truncate text-label text-muted-foreground">{meta}</span>
      </span>
      <CaretRightIcon aria-hidden="true" className="size-3.5 shrink-0 text-icon" />
    </button>
  )
}
