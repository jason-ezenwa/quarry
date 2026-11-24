import { userNameSchema } from '@quarry/contracts'
import { z } from 'zod'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from './auth.constants'

const email = z.string().trim().toLowerCase().pipe(z.email('Enter a valid email address'))

export const signInSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
})

const newPassword = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Use ${PASSWORD_MAX_LENGTH} characters or fewer`)

function withMatchingPasswords<T extends z.ZodType<{ password: string; confirmPassword: string }>>(schema: T) {
  return schema.refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
}

export const signUpSchema = withMatchingPasswords(
  z.object({
    name: userNameSchema,
    email,
    password: newPassword,
    confirmPassword: z.string(),
  }),
)

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = withMatchingPasswords(
  z.object({ password: newPassword, confirmPassword: z.string() }),
)
