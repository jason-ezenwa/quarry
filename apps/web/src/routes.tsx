import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppLayout } from './layouts/app-layout.tsx'
import { RootErrorBoundary, RootHydrateFallback, RootLayout } from './layouts/root-layout.tsx'
import { PATHS } from './lib/auth/auth.constants.ts'
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
          { path: PATHS.home, Component: HomePage },
          { path: PATHS.profile, Component: ProfilePage },
          { path: PATHS.resume, Component: ResumePage },
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
