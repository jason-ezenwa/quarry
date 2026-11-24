import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router'
import { AuthCard } from '@/components/auth-card/auth-card'
import { AuthNotice } from '@/components/auth-card/auth-notice'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { INVALID_TOKEN_CODE, OUTCOMES } from '@/features/password-reset/password-reset.constants'
import type { Outcome } from '@/features/password-reset/password-reset.types'
import { authClient } from '@/lib/auth-client'
import { PASSWORD_MIN_LENGTH, PATHS } from '@/lib/auth/auth.constants'
import { resetPasswordSchema } from '@/lib/auth/auth-schemas'
import type { ResetPasswordValues } from '@/lib/auth/auth.types'

// The server checks the link first and adds `token`, or `error` when it failed.
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [outcome, setOutcome] = useState<Outcome | null>(token ? null : 'invalid-link')
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  async function onSubmit({ password }: ResetPasswordValues) {
    if (!token) return
    setFormError(null)
    const { error } = await authClient.resetPassword({ newPassword: password, token })

    if (error?.code === INVALID_TOKEN_CODE) {
      setOutcome('invalid-link')
      return
    }

    if (error) {
      setFormError('We could not reset your password. Try again.')
      return
    }

    setOutcome('password-reset')
  }

  if (outcome) {
    return <AuthNotice {...OUTCOMES[outcome]} />
  }

  return (
    <AuthCard
      title="Set a new password"
      description="Choose a new password for your Quarry account."
      submitLabel="Reset password"
      submitting={isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
      alternative={
        <Button asChild variant="link">
          <Link to={PATHS.signIn}>Back to sign in</Link>
        </Button>
      }
    >
      <FieldGroup>
        {formError ? (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password">New password</FieldLabel>
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
          <FieldLabel htmlFor="confirmPassword">Confirm new password</FieldLabel>
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
