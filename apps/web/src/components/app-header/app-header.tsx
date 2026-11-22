import { useNavigate } from 'react-router'
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
    <header className="border-b bg-card">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
    </header>
  )
}
