import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'
import { AuthLayout } from '@/components/AuthLayout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/features/auth/FieldError'
import { PasswordInput } from '@/features/auth/PasswordInput'
import { password } from '@/features/auth/schemas'
import { useSession } from '@/features/auth/session'
import { supabase } from '@/lib/supabase'

const schema = z.object({ password })
type FormValues = z.infer<typeof schema>

// Supabase puts link errors (expired, already used) in the URL hash.
const linkFailed = () => new URLSearchParams(window.location.hash.slice(1)).has('error')

export function ResetPassword() {
  const navigate = useNavigate()
  const { session, loading, recovering, clearRecovering } = useSession()
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (loading) return null

  if (linkFailed() || !session || !recovering) {
    return (
      <AuthLayout title="This link has expired">
        <p className="text-sm">Reset links work once and for a limited time.</p>
        <Link to="/forgot-password" className="text-sm font-medium underline">
          Request a new one
        </Link>
      </AuthLayout>
    )
  }

  const onSubmit = async (values: FormValues) => {
    setError(null)
    const { error } = await supabase.auth.updateUser({ password: values.password })
    if (error) return setError(error.message)
    clearRecovering()
    toast.success('Your password has been changed.')
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout title="Choose a new password">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <div className="grid gap-2">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            aria-invalid={Boolean(formState.errors.password)}
            aria-describedby="password-hint password-error"
            {...register('password')}
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            At least 8 characters.
          </p>
          <FieldError id="password-error" message={formState.errors.password?.message} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" size="lg" disabled={formState.isSubmitting}>
          Save new password
        </Button>
      </form>
    </AuthLayout>
  )
}
