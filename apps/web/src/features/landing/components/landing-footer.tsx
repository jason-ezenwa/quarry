import { Link } from 'react-router'
import { PATHS } from '@/lib/auth/auth.constants'
import { SOURCE_URL } from '../landing.constants'

export function LandingFooter() {
  return (
    <footer className="flex w-full flex-1 justify-center border-t border-border-soft bg-panel">
      <div className="flex w-full max-w-300 justify-between gap-3 px-5 pt-4 pb-6 text-small text-muted-foreground md:px-6">
        <span>Quarry</span>
        <div className="flex gap-4">
          <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="hover:text-foreground">
            Open source
          </a>
          <Link to={PATHS.signIn} className="hover:text-foreground">
            Sign in
          </Link>
        </div>
      </div>
    </footer>
  )
}
