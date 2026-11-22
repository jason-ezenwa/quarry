import { Outlet, ScrollRestoration } from 'react-router'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { Spinner } from '@/components/ui/spinner'
import { TooltipProvider } from '@/components/ui/tooltip'

export function RootLayout() {
  return (
    <TooltipProvider>
      <Outlet />
      <ScrollRestoration />
      <Toaster />
    </TooltipProvider>
  )
}

// Shown while the first route's loader runs, before anything else renders.
export function RootHydrateFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Spinner className="size-6" />
    </div>
  )
}

// A loader failed, usually because the API is unreachable.
export function RootErrorBoundary() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-h1">Something went wrong</h1>
      <p className="text-body text-muted-foreground">
        We couldn't load this page. Check your connection and try again.
      </p>
      <Button onClick={() => window.location.reload()}>Try again</Button>
    </main>
  )
}
