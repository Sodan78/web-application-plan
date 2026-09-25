import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldError } from '@/features/auth/FieldError'
import { email } from '@/features/auth/schemas'
import { repo } from '@/lib/data'
import { useViewerMutation } from './hooks'

const schema = z.object({ email })
type FormValues = z.infer<typeof schema>

export function InviteDialog() {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, formState, reset } = useForm<FormValues>({ resolver: zodResolver(schema) })
  const send = useViewerMutation((viewerId, to: string) => repo.requestPair(viewerId, to), {
    success: (to) => `Request sent. ${to} will see it after signing in.`,
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger render={<Button size="lg" />}>Invite your partner</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite your partner</DialogTitle>
          <DialogDescription>
            They'll see your request when they sign in with this email, even if they create their account later.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          noValidate
          onSubmit={handleSubmit((v) => send.mutate(v.email, { onSuccess: () => setOpen(false) }))}
        >
          <div className="grid gap-2">
            <Label htmlFor="partner-email">Your partner's email</Label>
            <Input
              id="partner-email"
              type="email"
              autoComplete="off"
              aria-invalid={Boolean(formState.errors.email)}
              aria-describedby="partner-email-error"
              {...register('email')}
            />
            <FieldError id="partner-email-error" message={formState.errors.email?.message} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={send.isPending}>
              Send request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
