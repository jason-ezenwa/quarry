import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// `current` is drawn larger. `number` is null until the server numbers it.
export function InterviewQuestion({
  number,
  current = false,
  className,
  children,
  ...props
}: Omit<ComponentProps<'article'>, 'aria-label' | 'aria-current'> & { number: number | null; current?: boolean }) {
  const label = number === null ? 'Question' : `Question ${number}`

  return (
    <article
      data-slot="interview-question"
      aria-label={label}
      aria-current={current ? 'step' : undefined}
      className={cn('flex flex-col gap-2.5', className)}
      {...props}
    >
      <span aria-hidden="true" className="text-label text-muted-foreground">
        {label}
      </span>
      <p className={cn('wrap-anywhere text-foreground', current ? 'text-question' : 'text-reading')}>{children}</p>
    </article>
  )
}
