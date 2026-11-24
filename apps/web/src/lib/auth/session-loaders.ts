import { redirect } from 'react-router'
import { authClient } from '../auth-client'
import { profileQueryOptions } from '../profile/profile-api'
import { queryClient } from '../query-client'
import { PATHS } from './auth.constants'

// A session from before verification was required counts as signed out until verified.
async function hasSession(): Promise<boolean> {
  const { data } = await authClient.getSession()
  return Boolean(data?.user.emailVerified)
}

// Always asks the server, so a cached answer from before a 409 or another user's session never decides routing.
async function hasProfile(): Promise<boolean> {
  return Boolean(await queryClient.query(profileQueryOptions))
}

// Pages for signed-in users send everyone else to sign-in.
export async function requireSession() {
  if (!(await hasSession())) throw redirect(PATHS.signIn)
  return null
}

// Sign-in and sign-up send a signed-in user home.
export async function requireNoSession() {
  if (await hasSession()) throw redirect(PATHS.home)
  return null
}

// App pages send a signed-in user without a profile to onboarding. Run after requireSession.
export async function requireProfile() {
  if (!(await hasProfile())) throw redirect(PATHS.onboarding)
  return null
}

// Onboarding sends a user who already has a profile home. Run after requireSession.
export async function requireNoProfile() {
  if (await hasProfile()) throw redirect(PATHS.home)
  return null
}

// Runs loaders one after another, so a profile is only fetched once a session is known.
export function sequence(...loaders: Array<() => Promise<null>>) {
  return async () => {
    for (const loader of loaders) await loader()
    return null
  }
}
