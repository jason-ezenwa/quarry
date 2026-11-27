import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { PATHS } from '@/lib/auth/auth.constants'
import { hasSession } from '@/lib/auth/session-loaders'

// Checks the session after the landing page shows, so a slow or sleeping API never holds it back.
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
