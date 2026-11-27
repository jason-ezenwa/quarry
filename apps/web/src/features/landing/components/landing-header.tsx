import { Link } from 'react-router'
import { Wordmark } from '@/components/brand/wordmark'
import { Button } from '@/components/ui/button'
import { PATHS } from '@/lib/auth/auth.constants'
import { WAITLIST_URL } from '../landing.constants'

export function LandingHeader() {
  return (
    <header className="flex w-full max-w-300 items-center justify-between gap-4 py-3 pr-3 pl-5 md:px-6 md:py-5">
      <Wordmark />
      <nav aria-label="Account" className="flex items-center gap-1.5">
        <Button asChild variant="ghost" size="touch">
          <Link to={PATHS.signIn}>Sign in</Link>
        </Button>
        <Button asChild variant="secondary" className="max-md:hidden">
          <a href={WAITLIST_URL} target="_blank" rel="noreferrer">
            Join the waitlist
          </a>
        </Button>
      </nav>
    </header>
  )
}
