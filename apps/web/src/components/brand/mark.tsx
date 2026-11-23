import { BirdIcon } from '@phosphor-icons/react/dist/csr/Bird'
import { cn } from '@/lib/utils'

// Placeholder mark: Phosphor's bird in its Fill weight, the strongest at 18px.
export function Mark({ className }: { className?: string }) {
  return (
    <BirdIcon
      weight="fill"
      aria-hidden="true"
      className={cn('size-[18px] shrink-0 text-primary', className)}
    />
  )
}
