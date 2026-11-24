import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import type { AuthNoticeProps } from './auth-card.types'
import { AuthPanel } from './auth-panel'
import { AuthShell } from './auth-shell'

export function AuthNotice({ title, description, action }: AuthNoticeProps) {
  return (
    <AuthShell>
      <AuthPanel>
        <div className="flex flex-col gap-1">
          <h1 className="text-title">{title}</h1>
          <p className="text-ui text-muted-foreground">{description}</p>
        </div>
        <Button asChild variant="primary" size="lg" className="w-full sm:w-auto sm:self-start">
          <Link to={action.to}>{action.label}</Link>
        </Button>
      </AuthPanel>
    </AuthShell>
  )
}
