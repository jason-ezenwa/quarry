import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { AuthCard } from '@/components/auth-card/auth-card'
import { AuthNotice } from '@/components/auth-card/auth-notice'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { PATHS, RATE_LIMITED_MESSAGE, TOO_MANY_REQUESTS_STATUS } from '@/lib/auth/auth.constants'
import { forgotPasswordSchema } from '@/lib/auth/auth-schemas'
import type { ForgotPasswordValues } from '@/lib/auth/auth.types'

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit({ email }: ForgotPasswordValues) {
    setFormError(null)
    const { error } = await authClient.requestPasswordReset({ email })

    if (error) {
      setFormError(
        error.status === TOO_MANY_REQUESTS_STATUS ? RATE_LIMITED_MESSAGE : 'We could not send the link. Try again.',
      )
      return
    }

    setSentTo(email)
  }

  // The server answers the same whether or not the email has an account.
  if (sentTo) {
    return (
      <AuthNotice
        title="Check your email"
        description={`If there's a Quarry account for ${sentTo}, we've sent it a link to reset the password. The link expires in 1 hour.`}
        action={{ label: 'Back to sign in', to: PATHS.signIn }}
      />
    )
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we'll send you a link to set a new password."
      submitLabel="Send link"
      submitting={isSubmitting}
      onSubmit={handleSubmit(onSubmit)}
      alternative={
        <p className="text-ui text-muted-foreground">
          Remembered it?{' '}
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
      </FieldGroup>
    </AuthCard>
  )
}
