import { useCallback, useSyncExternalStore } from 'react'

// The `md` breakpoint: tablets and up.
export const MEDIUM_SCREEN_QUERY = '(min-width: 48rem)'

// The `xl` breakpoint: wide enough for the chat and the output panel side by side.
export const WIDE_SCREEN_QUERY = '(min-width: 80rem)'

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )

  return useSyncExternalStore(subscribe, () => matches(query), () => false)
}
