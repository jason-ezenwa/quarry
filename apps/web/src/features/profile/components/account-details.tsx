import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/use-current-user'

const WHITESPACE = /\s+/

function initials(name: string) {
  return name
    .trim()
    .split(WHITESPACE)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export function AccountDetails() {
  const { data: user, isPending, isError } = useCurrentUser()

  return (
    <Card size="sm" role="region" aria-label="Account">
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-10 w-full max-w-64" />
        ) : isError ? (
          <Alert variant="destructive">
            <AlertDescription>We couldn't load your account. Refresh to try again.</AlertDescription>
          </Alert>
        ) : (
          <div className="flex items-center gap-3.5">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-fit text-ui-strong text-fit-foreground"
            >
              {initials(user.name)}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-ui-strong">{user.name}</span>
              <span className="text-small wrap-anywhere text-muted-foreground">{user.email}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
