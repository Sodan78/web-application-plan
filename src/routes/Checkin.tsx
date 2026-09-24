import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PROMPTS } from '@/features/checkin/copy'
import { useCheckin, useCouple, useMyReflections, useViewerMutation } from '@/features/couple/hooks'
import { repo, type PromptKey } from '@/lib/data'

type Drafts = Record<PromptKey, string>

export function Checkin() {
  const { id = '' } = useParams()
  const checkin = useCheckin(id)
  const reflections = useMyReflections(id)

  if (checkin.isError) return <p>This check-in isn't available.</p>
  if (checkin.isPending || reflections.isPending) return null
  if (checkin.data.myStatus === 'finished' || checkin.data.closedAt || !checkin.data.coupleActive) {
    return <Navigate to={`/checkin/${id}/together`} replace />
  }

  const initial = Object.fromEntries(
    PROMPTS.map((p) => [p.key, reflections.data?.find((r) => r.prompt === p.key)?.body ?? '']),
  ) as Drafts

  return <CheckinFlow checkinId={id} initial={initial} />
}

function CheckinFlow({ checkinId, initial }: { checkinId: string; initial: Drafts }) {
  const [step, setStep] = useState<'write' | 'review'>('write')
  const [drafts, setDrafts] = useState<Drafts>(initial)

  return step === 'write' ? (
    <WriteStep checkinId={checkinId} drafts={drafts} setDrafts={setDrafts} onNext={() => setStep('review')} />
  ) : (
    <ReviewStep checkinId={checkinId} drafts={drafts} onBack={() => setStep('write')} />
  )
}

function WriteStep({
  checkinId,
  drafts,
  setDrafts,
  onNext,
}: {
  checkinId: string
  drafts: Drafts
  setDrafts: (update: (d: Drafts) => Drafts) => void
  onNext: () => void
}) {
  const [saved, setSaved] = useState<Partial<Record<PromptKey, boolean>>>({})
  const save = useViewerMutation((viewerId, args: { prompt: PromptKey; body: string }) =>
    repo.saveReflection(viewerId, checkinId, args.prompt, args.body),
  )
  const anyAnswered = PROMPTS.some((p) => drafts[p.key].trim())

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your check-in</CardTitle>
        <CardDescription>This is private. Nothing is shared unless you choose to at the end.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {PROMPTS.map((p) => (
          <div key={p.key} className="grid gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor={`prompt-${p.key}`} className="font-medium">
                {p.label}
              </label>
              <span className="text-xs text-muted-foreground" aria-live="polite">
                {saved[p.key] ? 'Saved' : ''}
              </span>
            </div>
            <p id={`prompt-${p.key}-help`} className="text-sm text-muted-foreground">
              {p.helper}
            </p>
            <Textarea
              id={`prompt-${p.key}`}
              aria-describedby={`prompt-${p.key}-help`}
              value={drafts[p.key]}
              rows={3}
              onChange={(e) => {
                const value = e.target.value
                setDrafts((d) => ({ ...d, [p.key]: value }))
                setSaved((s) => ({ ...s, [p.key]: false }))
              }}
              onBlur={() =>
                save.mutate(
                  { prompt: p.key, body: drafts[p.key] },
                  { onSuccess: () => setSaved((s) => ({ ...s, [p.key]: true })) },
                )
              }
            />
          </div>
        ))}
        <div className="flex justify-end">
          <Button
            disabled={!anyAnswered || save.isPending}
            onClick={async () => {
              // Save everything once more, in case a field still has focus.
              for (const p of PROMPTS) await save.mutateAsync({ prompt: p.key, body: drafts[p.key] })
              onNext()
            }}
          >
            Review and share
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ReviewStep({ checkinId, drafts, onBack }: { checkinId: string; drafts: Drafts; onBack: () => void }) {
  const navigate = useNavigate()
  const couple = useCouple()
  const partnerName = couple.data?.partner.displayName ?? 'your partner'
  const answered = PROMPTS.filter((p) => drafts[p.key].trim())
  const [sharing, setSharing] = useState<Partial<Record<PromptKey, boolean>>>({})
  const [shared, setShared] = useState<Drafts>(drafts)
  const [confirmEmpty, setConfirmEmpty] = useState(false)

  const finish = useViewerMutation<void>(
    (viewerId) =>
      repo.finishCheckin(
        viewerId,
        checkinId,
        answered.filter((p) => sharing[p.key]).map((p) => ({ prompt: p.key, body: shared[p.key] })),
      ),
    { success: () => 'Check-in finished.' },
  )
  const doFinish = () => finish.mutate(undefined, { onSuccess: () => navigate(`/checkin/${checkinId}/together`) })
  const nothingShared = !answered.some((p) => sharing[p.key])
  const emptyShare = answered.some((p) => sharing[p.key] && !shared[p.key].trim())

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose what to share</CardTitle>
        <CardDescription>Nothing is shared unless you choose.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {answered.map((p) => (
          <div key={p.key} className="grid gap-3 rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="grid gap-1">
                <p id={`share-${p.key}-title`} className="font-medium">
                  {p.label}
                </p>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{drafts[p.key].trim()}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label id={`share-${p.key}-label`} htmlFor={`share-${p.key}`} className="text-sm">
                  Share this
                </label>
                <Switch
                  id={`share-${p.key}`}
                  aria-labelledby={`share-${p.key}-label share-${p.key}-title`}
                  checked={sharing[p.key] ?? false}
                  onCheckedChange={(checked) => setSharing((s) => ({ ...s, [p.key]: checked }))}
                />
              </div>
            </div>
            {sharing[p.key] && (
              <div className="grid gap-2">
                <label htmlFor={`shared-${p.key}`} className="text-sm font-medium">
                  What {partnerName} will see
                </label>
                <Textarea
                  id={`shared-${p.key}`}
                  value={shared[p.key]}
                  rows={3}
                  onChange={(e) => {
                    const value = e.target.value
                    setShared((s) => ({ ...s, [p.key]: value }))
                  }}
                />
              </div>
            )}
          </div>
        ))}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button
            disabled={finish.isPending || emptyShare}
            onClick={() => (nothingShared ? setConfirmEmpty(true) : doFinish())}
          >
            Finish check-in
          </Button>
        </div>
      </CardContent>

      <AlertDialog open={confirmEmpty} onOpenChange={setConfirmEmpty}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finish without sharing anything?</AlertDialogTitle>
            <AlertDialogDescription>That's okay.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmEmpty(false)
                doFinish()
              }}
            >
              Finish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
