import type { FitLabel } from '@quarry/contracts'
import { cn } from '@/lib/utils'

const DOT_TONE: Record<FitLabel, string> = {
  'strong-fit': 'bg-success',
  'good-fit': 'bg-warning',
  'weak-fit': 'bg-destructive',
}

// The fit band at a glance, in lists and the sidebar.
export function FitDot({ label, className }: { label: FitLabel | null; className?: string }) {
  return <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', label ? DOT_TONE[label] : 'bg-border-strong', className)} />
}
