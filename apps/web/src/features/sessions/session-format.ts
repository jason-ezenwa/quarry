import { UTCDate } from '@date-fns/utc'
import { JOB_SOURCE_LABELS, type SessionSummary } from '@quarry/contracts'
import { format, parseISO } from 'date-fns'

// "Nov 22", in the viewer's own time zone.
export function formatShortDate(iso: string): string {
  return format(parseISO(iso), 'MMM d')
}

// "December 1". The monthly cap resets on the UTC calendar month, so the date is read in UTC.
export function formatResetDate(iso: string): string {
  return format(new UTCDate(iso), 'MMMM d')
}

export function sourceLabel(source: SessionSummary['source']): string | null {
  return source ? JOB_SOURCE_LABELS[source] : null
}

// Company, location and source on one line, leaving out whatever isn't known yet and any repeat,
// such as the Ashby board for a job at Ashby.
export function jobLine(parts: Array<string | null | undefined>): string {
  const shown: string[] = []

  for (const part of parts) {
    if (part && !shown.some((earlier) => earlier.toLowerCase() === part.toLowerCase())) shown.push(part)
  }

  return shown.join('  ·  ')
}

// The download name the server gives an export: `attachment; filename="ada-obi-resume.pdf"`.
export function attachmentFileName(disposition: string | null): string | null {
  return disposition?.match(/filename="([^"]+)"/)?.[1] ?? null
}
