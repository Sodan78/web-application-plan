import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router-dom'
import { z } from 'zod'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/features/auth/FieldError'
import { PasswordInput } from '@/features/auth/PasswordInput'
import { email } from '@/features/auth/schemas'
import { useSession } from '@/features/auth/session'
import { supabase } from '@/lib/supabase'

const schema = z.object({ email, password: z.string().min(1, 'Enter your password') })
type FormValues = z.infer<typeof schema>

export function SignIn() {
  const { session } = useSession()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const { errors } = formState

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (values: FormValues) => {
    setError(null)
    const { error } = await supabase.auth.signInWithPassword(values)
    if (!error) return
    // Never say which of email or password was wrong (AC-3.2).
    setError(
      error.code === 'email_not_confirmed'
        ? 'Please confirm your email first. Check your inbox.'
        : error.code === 'invalid_credentials'
          ? "That email and password don't match."
          : error.message,
    )
  }

  return (
    <AuthLayout
      title="Welcome back"
      footer={
        <>
          New here?{' '}
          <Link to="/sign-up" className="font-medium text-foreground underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            aria-describedby="email-error"
            {...register('email')}
          />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>
        <div className="grid gap-2">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="password">Password</Label>
            <Link to="/forgot-password" className="text-sm text-muted-foreground underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-error"
            {...register('password')}
          />
          <FieldError id="password-error" message={errors.password?.message} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={formState.isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}
