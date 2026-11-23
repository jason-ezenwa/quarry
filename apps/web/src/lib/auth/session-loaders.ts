import { redirect } from 'react-router'
import { authClient } from '../auth-client'
import { PATHS } from './auth.constants'

async function hasSession(): Promise<boolean> {
  const { data } = await authClient.getSession()
  return Boolean(data)
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
