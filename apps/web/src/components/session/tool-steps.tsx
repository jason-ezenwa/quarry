import { CaretDownIcon } from '@phosphor-icons/react/dist/csr/CaretDown'
import { CaretRightIcon } from '@phosphor-icons/react/dist/csr/CaretRight'
import { CircleNotchIcon } from '@phosphor-icons/react/dist/csr/CircleNotch'
import { Children, useId, useState, type ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { ToolStepContext, ToolStepsContext, useToolStep, useToolSteps } from './tool-steps-context'
import type { IconComponent, ToolStepsContextValue } from './session.types'

function Spin({ className }: { className?: string }) {
  return <CircleNotchIcon weight="bold" aria-hidden="true" className={cn('animate-spin motion-reduce:animate-none', className)} />
}

// The tools an agent ran. Open while any runs; once settled, folded away until opened.
function ToolSteps({ running, className, ...props }: ComponentProps<'div'> & { running: boolean }) {
  const [opened, setOpened] = useState(false)
  const listId = useId()

  const value: ToolStepsContextValue = {
    state: { running, open: running || opened },
    actions: { toggle: () => setOpened((current) => !current) },
    meta: { listId },
  }

  return (
    <ToolStepsContext value={value}>
      <div data-slot="tool-steps" className={cn('flex flex-col gap-1', className)} {...props} />
    </ToolStepsContext>
  )
}

// Shown while a step runs, beside a spinner.
function ToolStepsWorking({ children }: { children: string }) {
  const { state } = useToolSteps()
  if (!state.running) return null

  return (
    <p role="status" data-slot="tool-steps-working" className="flex h-6.5 items-center gap-2 text-small text-muted-foreground">
      <Spin className="size-3.75" />
      <span className="text-shimmer">{children}</span>
    </p>
  )
}

// Shown once settled, to open and fold the list.
function ToolStepsToggle({ children }: { children: string }) {
  const { state, actions, meta } = useToolSteps()
  if (state.running) return null

  return (
    <button
      type="button"
      data-slot="tool-steps-toggle"
      aria-expanded={state.open}
      aria-controls={meta.listId}
      onClick={actions.toggle}
      className="flex h-6.5 items-center gap-2 self-start rounded-sm text-small text-muted-foreground hover:text-foreground"
    >
      {children}
      {state.open ? (
        <CaretDownIcon aria-hidden="true" className="size-3 text-icon" />
      ) : (
        <CaretRightIcon aria-hidden="true" className="size-3 text-icon" />
      )}
    </button>
  )
}

// Left out while folded or empty.
function ToolStepList({ className, children, ...props }: ComponentProps<'ul'>) {
  const { state, meta } = useToolSteps()
  if (!state.open || Children.toArray(children).length === 0) return null

  return (
    <ul
      id={meta.listId}
      data-slot="tool-step-list"
      className={cn('ml-1.75 flex flex-col border-l border-border py-0.5 pl-3.5', className)}
      {...props}
    >
      {children}
    </ul>
  )
}

// A lone step, shown as it is rather than in a folding list.
function ToolStepSingle({ className, ...props }: ComponentProps<'ul'>) {
  return <ul data-slot="tool-step-single" className={cn('flex flex-col', className)} {...props} />
}

// unfinished: errored, or cut off when its reply stopped.
function ToolStep({
  running,
  unfinished,
  className,
  ...props
}: ComponentProps<'li'> & { running: boolean; unfinished: boolean }) {
  return (
    <ToolStepContext value={{ running, unfinished }}>
      <li
        data-slot="tool-step"
        className={cn('flex h-7 items-center gap-2.25 text-small text-muted-foreground', running && 'text-foreground', className)}
        {...props}
      />
    </ToolStepContext>
  )
}

// The step's icon, or a spinner while it runs.
function ToolStepIcon({ icon: StepIcon }: { icon: IconComponent }) {
  const { running } = useToolStep()
  if (running) return <Spin className="size-3.5" />
  return <StepIcon aria-hidden="true" className="size-3.5 shrink-0" />
}

function ToolStepLabel({ className, ...props }: ComponentProps<'span'>) {
  const { running } = useToolStep()
  return <span data-slot="tool-step-label" className={cn('truncate', running && 'text-shimmer', className)} {...props} />
}

function ToolStepNote({ className, ...props }: ComponentProps<'span'>) {
  const { unfinished } = useToolStep()

  return (
    <span
      data-slot="tool-step-note"
      className={cn('text-label', unfinished ? 'text-destructive-ink' : 'text-muted-foreground', className)}
      {...props}
    />
  )
}

export { ToolSteps, ToolStepsWorking, ToolStepsToggle, ToolStepList, ToolStepSingle, ToolStep, ToolStepIcon, ToolStepLabel, ToolStepNote }
