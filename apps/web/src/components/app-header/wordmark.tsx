import { Link } from 'react-router'
import { PATHS } from '@/lib/auth/auth.constants'
import { Mark } from './mark'

export function Wordmark() {
  return (
    <Link to={PATHS.home} className="flex items-center gap-2 text-wordmark text-foreground">
      <Mark />
      Quarry
    </Link>
  )
}
