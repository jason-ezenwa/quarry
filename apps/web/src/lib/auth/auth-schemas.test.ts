import { describe, expect, it } from 'vitest'
import { signInSchema, signUpSchema } from './auth-schemas'

const validSignUp = {
  name: 'Ada Obi',
  email: 'ada@example.com',
  password: 'correct-horse',
  confirmPassword: 'correct-horse',
}

function issues(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return (result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message])
}

describe('signInSchema', () => {
  it('normalises the email', () => {
    const result = signInSchema.parse({ email: '  Ada@Example.com ', password: 'x' })

    expect(result.email).toBe('ada@example.com')
  })

  it('rejects a malformed email and an empty password', () => {
    const result = signInSchema.safeParse({ email: 'ada', password: '' })

    expect(issues(result)).toEqual([
      ['email', 'Enter a valid email address'],
      ['password', 'Enter your password'],
    ])
  })
})

describe('signUpSchema', () => {
  it('accepts a complete sign-up', () => {
    expect(signUpSchema.safeParse(validSignUp).success).toBe(true)
  })

  it('rejects a password shorter than eight characters', () => {
    const result = signUpSchema.safeParse({ ...validSignUp, password: 'short', confirmPassword: 'short' })

    expect(issues(result)).toEqual([['password', 'Use at least 8 characters']])
  })

  it('reports mismatched passwords on the confirmation field', () => {
    const result = signUpSchema.safeParse({ ...validSignUp, confirmPassword: 'different-one' })

    expect(issues(result)).toEqual([['confirmPassword', 'Passwords do not match']])
  })

  it('rejects a blank name', () => {
    const result = signUpSchema.safeParse({ ...validSignUp, name: '   ' })

    expect(issues(result)).toEqual([['name', 'Enter your name']])
  })
})
