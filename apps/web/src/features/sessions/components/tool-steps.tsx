import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown'
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight'
import { CircleNotchIcon } from '@phosphor-icons/react/dist/csr/CircleNotch'
import { useId, useState } from 'react'
import { cn } from '@/lib/utils'
import { FALLBACK_TOOL_STEP } from '../sessions.constants'
import type { ToolStep } from '../sessions.types'

function Spin({ className }: { className?: string }) {
  return <CircleNotchIcon weight="bold" aria-hidden="true" className={cn('animate-spin motion-reduce:animate-none', className)} />
}

// While a step runs: a spinner, "Working" and the steps so far. Once settled:
// "N steps", folded away until opened.
export function ToolSteps({ steps, working = false }: { steps: ToolStep[]; working?: boolean }) {
  const running = working || steps.some((step) => step.running)
  const [opened, setOpened] = useState(false)
  const open = running || opened
  const listId = useId()
  const count = `${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`

  return (
    <div className="flex flex-col gap-1">
      {running ? (
        <p role="status" className="flex h-6.5 items-center gap-2 text-small text-muted-foreground">
          <Spin className="size-3.75" />
          <span className="text-shimmer">{FALLBACK_TOOL_STEP.active}</span>
        </p>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={listId}
          onClick={() => setOpened((value) => !value)}
          className="flex h-6.5 items-center gap-2 self-start rounded-sm text-small text-muted-foreground hover:text-foreground"
        >
          {count}
          {open ? (
            <CaretDownIcon aria-hidden="true" className="size-3 text-icon" />
          ) : (
            <CaretRightIcon aria-hidden="true" className="size-3 text-icon" />
          )}
        </button>
      )}
      {open && steps.length > 0 ? (
        <ul id={listId} className="ml-1.75 flex flex-col border-l border-border py-0.5 pl-3.5">
          {steps.map(({ id, icon: StepIcon, label, note, running: stepRunning, unfinished }) => (
            <li
              key={id}
              className={cn('flex h-7 items-center gap-2.25 text-small text-muted-foreground', stepRunning && 'text-foreground')}
            >
              {stepRunning ? <Spin className="size-3.5" /> : <StepIcon aria-hidden="true" className="size-3.5 shrink-0" />}
              <span className={cn('truncate', stepRunning && 'text-shimmer')}>{label}</span>
              {note ? (
                <span className={cn('text-label', unfinished ? 'text-destructive-ink' : 'text-muted-foreground')}>{note}</span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
