import { Navigate, useParams } from 'react-router-dom'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { conversationPrompt, formatDate, PROMPTS, promptLabel } from '@/features/checkin/copy'
import { useCheckin, useCouple, useShares, useViewerId, useViewerMutation } from '@/features/couple/hooks'
import { repo, type Share } from '@/lib/data'

export function Together() {
  const { id = '' } = useParams()
  const viewerId = useViewerId()
  const checkin = useCheckin(id)
  const shares = useShares(id)
  const couple = useCouple()

  if (checkin.isError) return <p>This check-in isn't available.</p>
  if (checkin.isPending || shares.isPending || couple.isPending) return null

  const c = checkin.data
  if (c.myStatus !== 'finished' && !c.closedAt && c.coupleActive) return <Navigate to={`/checkin/${id}`} replace />

  const partnerName = couple.data?.partner.displayName ?? 'Your partner'
  const byOrder = (a: Share, b: Share) =>
    PROMPTS.findIndex((p) => p.key === a.prompt) - PROMPTS.findIndex((p) => p.key === b.prompt)
  const mine = (shares.data ?? []).filter((s) => s.authorId === viewerId).sort(byOrder)
  const theirs = (shares.data ?? []).filter((s) => s.authorId !== viewerId).sort(byOrder)
  const bothFinished = c.myStatus === 'finished' && c.partnerFinished

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">Check-in together</h1>
        <p className="text-sm text-muted-foreground">Started {formatDate(c.createdAt)}</p>
      </div>

      {!c.coupleActive && (
        <p className="text-sm text-muted-foreground">This couple link has ended. Only what you shared is shown.</p>
      )}
      {c.myStatus !== 'finished' && (
        <p className="text-sm text-muted-foreground">This check-in closed before you finished. Your drafts stay private.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>You shared</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {mine.length === 0 && <p className="text-sm text-muted-foreground">You didn't share anything this time.</p>}
            {mine.map((s) => (
              <MyShare key={s.id} share={s} partnerName={partnerName} />
            ))}
          </CardContent>
        </Card>

        {c.coupleActive && (
          <Card>
            <CardHeader>
              <CardTitle>{partnerName} shared</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {!bothFinished ? (
                <p className="text-sm text-muted-foreground">
                  {partnerName} hasn't finished yet. Their shares will appear here when they do.
                </p>
              ) : theirs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{partnerName} didn't share anything this time.</p>
              ) : (
                theirs.map((s) => (
                  <div key={s.id} className="grid gap-1">
                    <p className="text-sm font-medium">{promptLabel(s.prompt)}</p>
                    <p className="whitespace-pre-wrap text-sm">{s.body}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {bothFinished && c.coupleActive && (
        <Card>
          <CardHeader>
            <CardDescription>To talk about together</CardDescription>
            <CardTitle>{conversationPrompt(c.id)}</CardTitle>
          </CardHeader>
        </Card>
      )}
    </>
  )
}

function MyShare({ share, partnerName }: { share: Share; partnerName: string }) {
  const withdraw = useViewerMutation<void>((viewerId) => repo.withdrawShare(viewerId, share.id))

  return (
    <div className="grid gap-1">
      <p className="text-sm font-medium">{promptLabel(share.prompt)}</p>
      {share.withdrawnAt ? (
        <p className="text-sm italic text-muted-foreground">You took this back.</p>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm">{share.body}</p>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="ghost" size="sm" className="justify-self-start px-0" />}>
              Take back
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Take this back?</AlertDialogTitle>
                <AlertDialogDescription>{partnerName} won't see it any more.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction disabled={withdraw.isPending} onClick={() => withdraw.mutate()}>
                  Take back
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}
