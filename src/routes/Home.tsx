import { Alert, AlertAction, AlertDescription } from '@/components/ui/alert'
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
import { useCouple, useEndNotice, usePairRequests, useViewerMutation } from '@/features/couple/hooks'
import { InviteDialog } from '@/features/couple/InviteDialog'
import { repo, type PairRequestView } from '@/lib/data'

export function Home() {
  const couple = useCouple()
  const requests = usePairRequests()
  const endNotice = useEndNotice()
  const dismissNotice = useViewerMutation<void>((viewerId) => repo.dismissEndNotice(viewerId))

  if (couple.isPending || requests.isPending) return null

  const incoming = requests.data?.filter((r) => r.direction === 'incoming') ?? []
  const outgoing = requests.data?.find((r) => r.direction === 'outgoing')

  return (
    <>
      {endNotice.data && !couple.data && (
        <Alert>
          <AlertDescription>Your couple link has ended.</AlertDescription>
          <AlertAction>
            <Button size="sm" variant="ghost" onClick={() => dismissNotice.mutate()}>
              OK
            </Button>
          </AlertAction>
        </Alert>
      )}

      {incoming.map((r) => (
        <IncomingRequest key={r.id} request={r} />
      ))}

      {couple.data ? (
        <Card>
          <CardHeader>
            <CardTitle>You're linked with {couple.data.partner.displayName}.</CardTitle>
            <CardDescription>Your reflections stay private unless you choose to share them.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Check-ins arrive in the next phase.</CardContent>
        </Card>
      ) : outgoing ? (
        <OutgoingRequest request={outgoing} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>You're not linked with a partner yet.</CardTitle>
            <CardDescription>Invite your partner to start doing check-ins together.</CardDescription>
          </CardHeader>
          <CardContent>
            <InviteDialog />
          </CardContent>
        </Card>
      )}
    </>
  )
}

function IncomingRequest({ request }: { request: PairRequestView }) {
  const respond = useViewerMutation(
    (viewerId, accept: boolean) => repo.respondToPair(viewerId, request.id, accept),
    { success: (accept) => (accept ? `You're now linked with ${request.otherName}.` : undefined) },
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{request.otherName} would like to link with you.</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger render={<Button />}>Accept</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Link with {request.otherName}?</AlertDialogTitle>
              <AlertDialogDescription>
                You'll do check-ins together. Your reflections stay private unless you share them.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Not now</AlertDialogCancel>
              <AlertDialogAction disabled={respond.isPending} onClick={() => respond.mutate(true)}>
                Link
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="outline" disabled={respond.isPending} onClick={() => respond.mutate(false)}>
          Decline
        </Button>
      </CardContent>
    </Card>
  )
}

function OutgoingRequest({ request }: { request: PairRequestView }) {
  const cancel = useViewerMutation<void>((viewerId) => repo.cancelPairRequest(viewerId, request.id))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Waiting for {request.otherName} to accept.</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
          Cancel request
        </Button>
      </CardContent>
    </Card>
  )
}
