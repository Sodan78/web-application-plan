import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/features/auth/FieldError'
import { PasswordInput } from '@/features/auth/PasswordInput'
import { displayName, email, password } from '@/features/auth/schemas'
import { supabase } from '@/lib/supabase'

const schema = z.object({ displayName, email, password })
type FormValues = z.infer<typeof schema>

export function SignUp() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const { errors } = formState

  const onSubmit = async (values: FormValues) => {
    setError(null)
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { display_name: values.displayName }, emailRedirectTo: window.location.origin },
    })
    // An existing email also lands here without an error, so the page never reveals it (AC-3.2).
    if (error) setError(error.message)
    else setSentTo(values.email)
  }

  if (sentTo) {
    return (
      <AuthLayout title="Check your email" footer={<Link to="/sign-in" className="underline">Back to sign in</Link>}>
        <p className="text-sm">We've sent a link to confirm {sentTo}. Open it to finish creating your account.</p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Each partner has their own account."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/sign-in" className="font-medium text-foreground underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="displayName">Your name</Label>
          <Input
            id="displayName"
            autoComplete="given-name"
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby="displayName-error"
            {...register('displayName')}
          />
          <FieldError id="displayName-error" message={errors.displayName?.message} />
        </div>
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
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            aria-describedby="password-hint password-error"
            {...register('password')}
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            At least 8 characters.
          </p>
          <FieldError id="password-error" message={errors.password?.message} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={formState.isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}
