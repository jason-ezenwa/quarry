import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppLayout } from './layouts/app-layout.tsx'
import { RootErrorBoundary, RootHydrateFallback, RootLayout } from './layouts/root-layout.tsx'
import { primaryResumeQueryOptions } from './features/primary-resume/primary-resume-api.ts'
import { currentUserQueryOptions } from './hooks/use-current-user.ts'
import { PATHS } from './lib/auth/auth.constants.ts'
import { queryClient } from './lib/query-client.ts'
import {
  requireNoProfile,
  requireNoSession,
  requireProfile,
  requireSession,
  sequence,
} from './lib/auth/session-loaders.ts'
import { HomePage } from './pages/home/index.tsx'
import { OnboardingPage } from './pages/onboarding/index.tsx'
import { ProfilePage } from './pages/profile/index.tsx'
import { ResumePage } from './pages/resume/index.tsx'
import { SignInPage } from './pages/sign-in/index.tsx'
import { SignUpPage } from './pages/sign-up/index.tsx'

// A page's own queries start alongside the parent's session and profile checks, not after them.
// Not awaited, so the page still renders as soon as the gate passes.
function prefetchResume() {
  void queryClient.prefetchQuery(primaryResumeQueryOptions)
  return null
}

function prefetchUserAndResume() {
  void queryClient.prefetchQuery(currentUserQueryOptions)
  return prefetchResume()
}

// The design system page is a development aid, so it is left out of production builds.
const developmentRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/design-system',
        lazy: () => import('./pages/design-system/index.tsx'),
        hydrateFallbackElement: <p className="m-auto text-ui text-muted-foreground">Loading…</p>,
      },
    ]
  : []

export const routes: RouteObject[] = [
  {
    Component: RootLayout,
    HydrateFallback: RootHydrateFallback,
    ErrorBoundary: RootErrorBoundary,
    children: [
      {
        Component: AppLayout,
        loader: sequence(requireSession, requireProfile),
        children: [
          {
            path: PATHS.home,
            loader: prefetchUserAndResume,
            Component: HomePage,
          },
          {
            path: PATHS.profile,
            loader: prefetchUserAndResume,
            Component: ProfilePage,
          },
          { path: PATHS.resume, loader: prefetchResume, Component: ResumePage },
        ],
      },
      { path: PATHS.onboarding, loader: sequence(requireSession, requireNoProfile), Component: OnboardingPage },
      { path: PATHS.signIn, loader: requireNoSession, Component: SignInPage },
      { path: PATHS.signUp, loader: requireNoSession, Component: SignUpPage },
      ...developmentRoutes,
    ],
  },
]

export const router = createBrowserRouter(routes)
