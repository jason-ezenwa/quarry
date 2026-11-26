import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// Once the interview has ended, every asked question counts as answered.
export function InterviewProgress({
  asked,
  total,
  ended,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'role' | 'children'> & { asked: number; total: number; ended: boolean }) {
  const answered = ended ? asked : Math.max(asked - 1, 0)
  const current = ended || asked === 0 ? null : asked - 1

  return (
    <div
      data-slot="interview-progress"
      role="progressbar"
      aria-label="Interview progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={asked}
      aria-valuetext={`Question ${asked} of ${total}`}
      className={cn('flex w-full gap-1', className)}
      {...props}
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn('h-0.75 flex-1 rounded-full bg-border', index < answered && 'bg-fit', index === current && 'bg-foreground')}
        />
      ))}
    </div>
  )
}
