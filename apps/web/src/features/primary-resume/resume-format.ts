const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// "2024" stays "2024"; "2024-03" reads "Mar 2024".
export function formatPartialDate(date: string): string {
  const [year, month] = date.split('-')
  return month ? `${MONTHS[Number(month) - 1]} ${year}` : year
}

// No end date means the role is current.
export function formatDateRange(start: string | undefined, end: string | undefined): string | undefined {
  const to = end ? formatPartialDate(end) : 'now'
  return start ? `${formatPartialDate(start)}–${to}` : end ? to : undefined
}

// "23 Nov", for when something happened.
export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(iso))
}
