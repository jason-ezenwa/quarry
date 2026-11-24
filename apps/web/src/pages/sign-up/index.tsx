import { zodResolver } from '@hookform/resolvers/zod'
import { INVALID_NAME_CODE, USER_NAME_INVALID_MESSAGE } from '@quarry/contracts'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { AuthCard } from '@/components/auth-card/auth-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { VerifyEmailState } from '@/features/email-verification/email-verification.types'
import { authClient } from '@/lib/auth-client'
import { PASSWORD_MIN_LENGTH, PATHS, SIGN_UP_ERRORS } from '@/lib/auth/auth.constants'
import { signUpSchema } from '@/lib/auth/auth-schemas'
import type { SignUpValues } from '@/lib/auth/auth.types'

export function SignUpPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  async function onSubmit({ name, email, password }: SignUpValues) {
    setFormError(null)

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
    })

    // The server's name check, for anything the form's own check let through.
    if (error?.code === INVALID_NAME_CODE) {
      setError('name', { message: error.message ?? USER_NAME_INVALID_MESSAGE })
      return
    }

    if (error) {
      setFormError(SIGN_UP_ERRORS[error.status] ?? 'We could not create your account. Try again.')
      return
    }

    // No session yet, and the same answer for an email that already has an account.
    navigate(PATHS.verifyEmail, { state: { email, from: 'sign-up' } satisfies VerifyEmailState })
  }

  return (
    <AuthCard
      title="Create an account"
      description="Sign up with your email and a password."
      submitLabel="Create account"
      submitting={isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
      alternative={
        <p className="text-ui text-muted-foreground">
          Already have an account?{' '}
          <Button asChild variant="link">
            <Link to={PATHS.signIn}>Sign in</Link>
          </Button>
        </p>
      }
    >
      <FieldGroup>
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" autoComplete="name" aria-invalid={Boolean(errors.name)} {...register('name')} />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          {errors.password ? (
            <FieldError errors={[errors.password]} />
          ) : (
            <FieldDescription>At least {PASSWORD_MIN_LENGTH} characters.</FieldDescription>
          )}
        </Field>
        <Field data-invalid={Boolean(errors.confirmPassword)}>
          <FieldLabel htmlFor="confirmPassword">Confirm password</FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register('confirmPassword')}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
      </FieldGroup>
    </AuthCard>
  )
}
