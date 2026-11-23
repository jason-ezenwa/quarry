import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { AuthCard } from '@/components/auth-card/auth-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth-client'
import { PASSWORD_MIN_LENGTH, PATHS } from '@/lib/auth/auth.constants'
import { signUpSchema, type SignUpValues } from '@/lib/auth/auth-schemas'

export function SignUpPage() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  })

  async function onSubmit({ name, email, password }: SignUpValues) {
    setFormError(null)
    const { error } = await authClient.signUp.email({ name, email, password })

    if (error) {
      setFormError(
        error.status === 422
          ? 'An account with this email already exists.'
          : 'We could not create your account. Try again.',
      )
      return
    }

    navigate(PATHS.onboarding)
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
