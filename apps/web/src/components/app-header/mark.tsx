import { cn } from '@/lib/utils'

// Placeholder mark: a geometric bird with the eye cut out, so it sits on any ground.
export function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn('size-[18px] shrink-0 text-primary', className)}
    >
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M4 20V12a8 8 0 0 1 8-8a5 5 0 0 1 5 5v1.5l3.5 1.5-3.5 1.5V13a7 7 0 0 1-7 7zM15.3 8.6a1.1 1.1 0 1 0-2.2 0a1.1 1.1 0 1 0 2.2 0z"
      />
    </svg>
  )
}
