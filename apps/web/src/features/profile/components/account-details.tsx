import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/use-current-user'
import { getInitials } from '@/lib/get-initials'

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
            <Avatar size="lg" aria-hidden="true">
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
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
