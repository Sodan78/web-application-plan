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
import { email } from '@/features/auth/schemas'
import { supabase } from '@/lib/supabase'

const schema = z.object({ email })
type FormValues = z.infer<typeof schema>

export function ForgotPassword() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = async (values: FormValues) => {
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    // Same message whether or not the account exists (AC-3.2).
    setSentTo(values.email)
  }

  return (
    <AuthLayout
      title="Reset your password"
      description={sentTo ? undefined : "Enter your email and we'll send you a link."}
      footer={
        <Link to="/sign-in" className="underline">
          Back to sign in
        </Link>
      }
    >
      {sentTo ? (
        <p className="text-sm" role="status">
          If there's an account for {sentTo}, we've sent a link to reset the password.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(formState.errors.email)}
              aria-describedby="email-error"
              {...register('email')}
            />
            <FieldError id="email-error" message={formState.errors.email?.message} />
          </div>
          <Button type="submit" size="lg" disabled={formState.isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
