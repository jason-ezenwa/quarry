import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import type { IconComponent } from './session.types'

// The cards one reply saved.
function OutputCardList({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="output-card-list" className={cn('flex flex-col gap-2', className)} {...props} />
}

// A saved output in the chat, opened in the panel on click. active: the panel shows it.
function OutputCard({
  active,
  className,
  children,
  ...props
}: Omit<ComponentProps<'button'>, 'type' | 'aria-pressed'> & { active: boolean }) {
  return (
    <button
      type="button"
      data-slot="output-card"
      aria-pressed={active}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg bg-card py-2.5 pr-3 pl-2.5 text-left ring-1 ring-border transition-shadow hover:ring-border-strong md:max-w-90',
        active && 'ring-foreground hover:ring-foreground',
        className,
      )}
      {...props}
    >
      {children}
      <CaretRightIcon aria-hidden="true" className="size-3.5 shrink-0 text-icon" />
    </button>
  )
}

// Leads the card with a score.
function OutputCardScore({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      data-slot="output-card-score"
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-md bg-fit text-tile text-fit-foreground', className)}
      {...props}
    />
  )
}

// Leads the card with the output's icon.
function OutputCardIcon({ icon: Icon, className }: { icon: IconComponent; className?: string }) {
  return (
    <span
      data-slot="output-card-icon"
      className={cn('flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground', className)}
    >
      <Icon aria-hidden="true" className="size-4.5" />
    </span>
  )
}

function OutputCardText({ className, ...props }: ComponentProps<'span'>) {
  return <span data-slot="output-card-text" className={cn('flex min-w-0 flex-1 flex-col gap-0.5', className)} {...props} />
}

function OutputCardTitle({ className, ...props }: ComponentProps<'span'>) {
  return <span data-slot="output-card-title" className={cn('text-ui-strong', className)} {...props} />
}

function OutputCardMeta({ className, ...props }: ComponentProps<'span'>) {
  return <span data-slot="output-card-meta" className={cn('truncate text-label text-muted-foreground', className)} {...props} />
}

export { OutputCardList, OutputCard, OutputCardScore, OutputCardIcon, OutputCardText, OutputCardTitle, OutputCardMeta }
