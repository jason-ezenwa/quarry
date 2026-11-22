import { Link } from 'react-router'
import { PATHS } from '@/lib/auth/auth.constants'

export function Wordmark() {
  return (
    <Link to={PATHS.home} className="text-wordmark text-brand">
      quarry
    </Link>
  )
}
