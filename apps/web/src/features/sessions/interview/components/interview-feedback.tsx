import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown'
import { CaretUpIcon } from '@phosphor-icons/react/dist/csr/CaretUp'
import type { StrongerAnswer } from '@quarry/contracts'
import { useId, useState, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { formatShortDate } from '../../session-format'

export function InterviewFeedback({ className, children, ...props }: ComponentProps<'article'>) {
  return (
    <article data-slot="interview-feedback" aria-label="Interview feedback" className={cn('flex flex-col gap-6.5', className)} {...props}>
      {children}
    </article>
  )
}

// When the interview ended and how many questions it had, for the panel's name row.
export function FeedbackMeta({ endedAt, questionCount }: { endedAt: string; questionCount: number }) {
  return (
    <span className="flex gap-4">
      <span>{formatShortDate(endedAt)}</span>
      <span>{questionCount === 1 ? '1 question' : `${questionCount} questions`}</span>
    </span>
  )
}

export function FeedbackPoints({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="feedback-points" className={cn('grid gap-8 sm:grid-cols-2', className)} {...props} />
}

function Points({ title, items, tone }: { title: string; items: string[]; tone: 'success' | 'warning' }) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2">
      <h3 id={headingId} className="flex items-center gap-2 text-small-strong">
        <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', tone === 'success' ? 'bg-success' : 'bg-warning')} />
        {title}
      </h3>
      <ul className="flex flex-col">
        {items.map((item, index) => (
          <li key={index} className="flex min-h-9 items-center border-t border-border py-2 text-ui">
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function WentWell({ items }: { items: string[] }) {
  return <Points title="Went well" items={items} tone="success" />
}

export function ToImprove({ items }: { items: string[] }) {
  return <Points title="To improve" items={items} tone="warning" />
}

function StrongerAnswerItem({ answer, open, onToggle }: { answer: StrongerAnswer; open: boolean; onToggle: () => void }) {
  const bodyId = useId()

  return (
    <li className="border-t border-border first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
        className={cn(
          'flex min-h-12 w-full items-center gap-2.5 px-4.5 py-3 text-left hover:bg-accent',
          open ? 'text-reading-strong' : 'text-ui',
        )}
      >
        <span className="min-w-0 flex-1">{answer.question}</span>
        {open ? (
          <CaretUpIcon aria-hidden="true" className="size-4.5 shrink-0 text-icon" />
        ) : (
          <CaretDownIcon aria-hidden="true" className="size-4.5 shrink-0 text-icon" />
        )}
      </button>
      {open ? (
        <div id={bodyId} className="grid border-t border-border-soft @lg:grid-cols-2">
          <div className="flex flex-col gap-2 border-b border-border-soft px-4.5 py-4 @lg:border-r @lg:border-b-0">
            <span className="text-label text-muted-foreground">You said</span>
            <p className="text-reading wrap-anywhere text-muted-foreground">{answer.said}</p>
          </div>
          <div className="flex flex-col gap-2 bg-success-tint px-4.5 py-4">
            <span className="text-label text-success-ink">Stronger</span>
            <p className="text-reading wrap-anywhere">{answer.stronger}</p>
          </div>
        </div>
      ) : null}
    </li>
  )
}

// Side by side only when the list itself is wide enough, so it fits a narrow panel.
// One answer is open at a time, the first to start with.
export function StrongerAnswers({ answers }: { answers: StrongerAnswer[] }) {
  const headingId = useId()
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-4">
        <h3 id={headingId} className="text-small-strong">
          Stronger answers
        </h3>
        <span className="text-label text-muted-foreground">{open === null ? answers.length : `${open + 1} of ${answers.length}`}</span>
      </div>
      <ul className="@container overflow-hidden rounded-lg border border-border bg-card">
        {answers.map((answer, index) => (
          <StrongerAnswerItem
            key={index}
            answer={answer}
            open={open === index}
            onToggle={() => setOpen((current) => (current === index ? null : index))}
          />
        ))}
      </ul>
    </section>
  )
}

// Chiefly answers to questions left for the feedback. Leave it out when empty.
export function AdditionalNotes({ children }: { children: string }) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="text-small-strong">
        Additional notes
      </h3>
      <p className="text-reading wrap-anywhere whitespace-pre-wrap">{children}</p>
    </section>
  )
}
