import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { AuthCard } from '@/components/auth-card/auth-card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { authClient } from '@/lib/auth-client'
import { PATHS } from '@/lib/auth/auth.constants'
import { signInSchema, type SignInValues } from '@/lib/auth/auth-schemas'

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

    if (error) {
      setFormError(error.status === 401 ? 'Incorrect email or password.' : 'We could not sign you in. Try again.')
      return
    }

    navigate(PATHS.home)
  }

  return (
    <AuthCard
      title="Sign in"
      description="Welcome back. Enter your email and password."
      footer={
        <p className="text-body text-muted-foreground">
          New to Quarry?{' '}
          <Button asChild variant="link">
            <Link to={PATHS.signUp}>Create an account</Link>
          </Button>
        </p>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
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
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              {...register('password')}
            />
            <FieldError errors={[errors.password]} />
          </Field>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Spinner className="text-current" /> : null}
            Sign in
          </Button>
        </FieldGroup>
      </form>
    </AuthCard>
  )
}
