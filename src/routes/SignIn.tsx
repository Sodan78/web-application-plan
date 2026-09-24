import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession } from '@/features/auth/session'
import { repo } from '@/lib/data'

const schema = z.object({ displayName: z.string().trim().min(1, 'Enter a name').max(40) })
type FormValues = z.infer<typeof schema>

export function SignIn() {
  const { profile, signIn } = useSession()
  const queryClient = useQueryClient()
  const profiles = useQuery({ queryKey: ['profiles'], queryFn: () => repo.listProfiles() })
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const create = useMutation({
    mutationFn: ({ displayName }: FormValues) => repo.createProfile(displayName),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['profiles'] })
      signIn(created.id)
    },
  })

  if (profile) return <Navigate to="/" replace />

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Who's using the app?</CardTitle>
          <CardDescription>Everything is stored only in this browser for now.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          {profiles.data && profiles.data.length > 0 && (
            <div className="grid gap-2">
              {profiles.data.map((p) => (
                <Button key={p.id} variant="outline" onClick={() => signIn(p.id)}>
                  {p.displayName}
                </Button>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit((v) => create.mutate(v))} className="grid gap-4" noValidate>
            <div className="grid gap-2">
              <Label htmlFor="displayName">New profile</Label>
              <Input id="displayName" autoComplete="given-name" {...register('displayName')} />
              {formState.errors.displayName && (
                <p className="text-sm text-destructive">{formState.errors.displayName.message}</p>
              )}
            </div>
            <Button type="submit" disabled={create.isPending}>
              Create profile
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
