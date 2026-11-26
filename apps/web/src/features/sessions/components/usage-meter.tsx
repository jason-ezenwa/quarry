import type { UsageCount } from '@quarry/contracts'
import { useId } from 'react'
import { Meter } from '@/components/ui/meter'
import { useUsage } from '../hooks/use-sessions'
import { formatResetDate } from '../session-format'

// One monthly count against its cap, with the reset date once it runs out.
function UsageCountMeter({ label, usage }: { label: string; usage: UsageCount }) {
  const labelId = useId()
  const { used, limit, resetsAt } = usage

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span id={labelId}>{label}</span>
        <span className="text-label text-muted-foreground">
          {used} of {limit}
        </span>
      </div>
      <Meter min={0} max={limit} value={Math.min(used, limit)} aria-labelledby={labelId} />
      {used >= limit ? <span className="text-label text-muted-foreground">More on {formatResetDate(resetsAt)}</span> : null}
    </div>
  )
}

// This month's applications and interviews against their caps.
export function UsageMeter() {
  const { data } = useUsage()
  if (!data) return null

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border-soft bg-card/60 px-2.5 py-3 text-small">
      <UsageCountMeter label="Applications" usage={data.sessions} />
      <UsageCountMeter label="Interviews" usage={data.interviews} />
    </div>
  )
}
