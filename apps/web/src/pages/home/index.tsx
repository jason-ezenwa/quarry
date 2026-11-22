import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentUser } from '@/hooks/use-current-user'

export function HomePage() {
  const { data: user, isPending, isError } = useCurrentUser()

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="text-h1">Home</h1>
      {isPending ? (
        <Skeleton className="h-28 w-full max-w-md" />
      ) : isError ? (
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>Couldn't load your account</AlertTitle>
          <AlertDescription>Refresh the page to try again.</AlertDescription>
        </Alert>
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome, {user.name}</CardTitle>
            <CardDescription>Signed in as {user.email}</CardDescription>
          </CardHeader>
          <CardContent className="text-body text-muted-foreground">
            Member since {new Date(user.createdAt).toLocaleDateString()}
          </CardContent>
        </Card>
      )}
    </main>
  )
}
