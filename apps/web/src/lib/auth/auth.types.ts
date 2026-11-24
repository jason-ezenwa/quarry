import type { z } from 'zod'
import type { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from './auth-schemas'

export type SignInValues = z.infer<typeof signInSchema>
export type SignUpValues = z.infer<typeof signUpSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
