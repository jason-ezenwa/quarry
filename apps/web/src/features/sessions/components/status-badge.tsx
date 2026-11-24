import type { SessionStatus } from '@quarry/contracts'
import { Badge } from '@/components/ui/badge'
import { SESSION_STATUS_DISPLAY } from '../sessions.constants'

export function StatusBadge({ status }: { status: SessionStatus }) {
  const { label, variant } = SESSION_STATUS_DISPLAY[status]
  return <Badge variant={variant}>{label}</Badge>
}
