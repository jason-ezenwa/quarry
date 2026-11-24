import { useId } from 'react'
import { Meter } from '@/components/ui/meter'
import { useUsage } from '../hooks/use-sessions'
import { formatResetDate } from '../session-format'

// This month's applications against the cap, at the foot of the sidebar.
export function UsageMeter() {
  const { data } = useUsage()
  const labelId = useId()
  if (!data) return null

  const { used, limit, resetsAt } = data.sessions

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border-soft bg-card/60 px-2.5 py-3 text-small">
      <div className="flex items-baseline justify-between gap-2">
        <span id={labelId}>Applications</span>
        <span className="text-label text-muted-foreground">
          {used} of {limit}
        </span>
      </div>
      <Meter min={0} max={limit} value={Math.min(used, limit)} aria-labelledby={labelId} />
      {used >= limit ? <span className="text-label text-muted-foreground">More on {formatResetDate(resetsAt)}</span> : null}
    </div>
  )
}
