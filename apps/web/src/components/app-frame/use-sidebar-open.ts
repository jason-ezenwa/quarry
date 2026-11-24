import { useCallback, useState } from 'react'
import { SIDEBAR_STORAGE_KEY } from './app-frame.constants'

// Storage can be missing or throw, as in a private window; the sidebar then starts open and isn't remembered.
function readHidden(): boolean {
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeHidden(hidden: boolean) {
  try {
    if (hidden) window.localStorage.setItem(SIDEBAR_STORAGE_KEY, 'true')
    else window.localStorage.removeItem(SIDEBAR_STORAGE_KEY)
  } catch {
    // Not remembered, but still hidden for this visit.
  }
}

// Whether the sidebar shows beside the page, remembered across visits.
export function useSidebarOpen() {
  const [open, setOpen] = useState(() => !readHidden())

  const setSidebarOpen = useCallback((next: boolean) => {
    setOpen(next)
    writeHidden(!next)
  }, [])

  return [open, setSidebarOpen] as const
}
