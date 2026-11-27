import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { PATHS } from '@/lib/auth/auth.constants'
import { hasSession } from '@/lib/auth/session-loaders'

// Runs after render so a sleeping API never holds the page back.
export function useRedirectSignedIn() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    hasSession()
      .then((signedIn) => {
        if (signedIn && !cancelled) navigate(PATHS.home, { replace: true })
      })
      // Unreachable API: the visitor stays on the landing page.
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [navigate])
}
