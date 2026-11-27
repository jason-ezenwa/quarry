import type { z } from 'zod'
import type { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from './auth-schemas'

export type SignInValues = z.infer<typeof signInSchema>
export type SignUpValues = z.infer<typeof signUpSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

// Why sign-up didn't go through, beyond a field's own error.
export type SignUpProblem = { kind: 'not-invited' } | { kind: 'error'; message: string }
