import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { AuthCard } from '@/components/auth-card/auth-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { VerifyEmailState } from '@/features/email-verification/email-verification.types'
import { authClient } from '@/lib/auth-client'
import { PATHS, SIGN_IN_ERRORS } from '@/lib/auth/auth.constants'
import { signInSchema } from '@/lib/auth/auth-schemas'
import type { SignInValues } from '@/lib/auth/auth.types'

export function SignInPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: SignInValues) {
    setFormError(null)
    const { error } = await authClient.signIn.email(values)

    // The check-your-email page offers a new link, under the resend limit.
    if (error?.code === 'EMAIL_NOT_VERIFIED') {
      navigate(PATHS.verifyEmail, { state: { email: values.email, from: 'sign-in' } satisfies VerifyEmailState })
      return
    }

    if (error) {
      setFormError(SIGN_IN_ERRORS[error.status] ?? 'We could not sign you in. Try again.')
      return
    }

    navigate(PATHS.home)
  }

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Enter your email and password."
      submitLabel="Sign in"
      submitting={isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
      alternative={
        <p className="text-ui text-muted-foreground">
          New to Quarry?{' '}
          <Button asChild variant="link">
            <Link to={PATHS.signUp}>Create an account</Link>
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
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Button asChild variant="link">
              <Link to={PATHS.forgotPassword}>Forgot password?</Link>
            </Button>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...register('password')}
          />
          <FieldError errors={[errors.password]} />
        </Field>
      </FieldGroup>
    </AuthCard>
  )
}
