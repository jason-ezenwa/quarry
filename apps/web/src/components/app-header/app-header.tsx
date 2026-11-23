import { NavLink, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'
import { PATHS } from '@/lib/auth/auth.constants'
import { queryClient } from '@/lib/query-client'
import { Wordmark } from './wordmark'

export function AppHeader() {
  const navigate = useNavigate()

  async function signOut() {
    await authClient.signOut()
    queryClient.clear()
    navigate(PATHS.signIn)
  }

  return (
    <header className="border-b border-border-soft">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Main" className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <NavLink to={PATHS.profile} className="aria-[current=page]:text-foreground">
              Profile
            </NavLink>
          </Button>
          <Button variant="ghost" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </nav>
      </div>
    </header>
  )
}
