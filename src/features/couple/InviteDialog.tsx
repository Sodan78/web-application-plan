import { useState } from 'react'
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
import { useSession } from '@/features/auth/session'
import { repo } from '@/lib/data'
import { usePairCandidates, useViewerMutation } from './hooks'

export function InviteDialog() {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const { signOut } = useSession()
  const candidates = usePairCandidates(open)
  const send = useViewerMutation((viewerId, toId: string) => repo.requestPair(viewerId, toId), {
    success: (toId) => `Request sent to ${candidates.data?.find((c) => c.id === toId)?.displayName}.`,
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setSelected(null)
      }}
    >
      <DialogTrigger render={<Button />}>Invite your partner</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite your partner</DialogTitle>
          <DialogDescription>They'll need to accept before you're linked.</DialogDescription>
        </DialogHeader>

        {candidates.data?.length === 0 ? (
          <div className="grid gap-3">
            <p className="text-sm">No one else has a profile in this browser yet. Ask your partner to create one.</p>
            <Button variant="outline" onClick={signOut}>
              Switch profile
            </Button>
          </div>
        ) : (
          <fieldset className="grid gap-2">
            <legend className="sr-only">Choose your partner</legend>
            {candidates.data?.map((c) => (
              <label
                key={c.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 has-checked:border-primary"
              >
                <input
                  type="radio"
                  name="partner"
                  value={c.id}
                  checked={selected === c.id}
                  onChange={() => setSelected(c.id)}
                  className="accent-primary"
                />
                {c.displayName}
              </label>
            ))}
          </fieldset>
        )}

        {candidates.data && candidates.data.length > 0 && (
          <DialogFooter>
            <Button
              disabled={!selected || send.isPending}
              onClick={() => selected && send.mutate(selected, { onSuccess: () => setOpen(false) })}
            >
              Send request
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
