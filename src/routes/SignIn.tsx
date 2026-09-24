import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/features/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

const schema = z.object({ email: z.email('Enter a valid email address') })
type FormValues = z.infer<typeof schema>

export function SignIn() {
  const { session } = useAuth()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) })

  if (session) return <Navigate to="/" replace />

  const onSubmit = async ({ email }: FormValues) => {
    setError(null)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    else setSentTo(email)
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>We'll email you a link. No password needed.</CardDescription>
        </CardHeader>
        <CardContent>
          {sentTo ? (
            <p className="text-sm">Check {sentTo} for your sign-in link.</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...register('email')} />
                {formState.errors.email && (
                  <p className="text-sm text-destructive">{formState.errors.email.message}</p>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" disabled={formState.isSubmitting}>
                Send link
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
