import { ButtonLink } from '@/components/ButtonLink'
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
import { Link, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate } from '@/features/checkin/copy'
import {
  useAssessmentDone,
  useCheckins,
  useCheckinStatus,
  useCouple,
  useEndNotice,
  usePairRequests,
  useViewerMutation,
} from '@/features/couple/hooks'
import { InviteDialog } from '@/features/couple/InviteDialog'
import { repo, type CheckinView, type PairRequestView } from '@/lib/data'

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
        <PairedHome partnerName={couple.data.partner.displayName} />
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

function PairedHome({ partnerName }: { partnerName: string }) {
  const navigate = useNavigate()
  const assessmentDone = useAssessmentDone()
  const status = useCheckinStatus()
  const checkins = useCheckins()
  const start = useViewerMutation<void, CheckinView>((viewerId) => repo.startCheckin(viewerId))
  const startAndGo = () => start.mutate(undefined, { onSuccess: (checkin) => navigate(`/checkin/${checkin.id}`) })

  if (assessmentDone.isPending || status.isPending || checkins.isPending) return null

  const open = status.data?.open
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>You're linked with {partnerName}.</CardTitle>
          <CardDescription>Your reflections stay private unless you choose to share them.</CardDescription>
        </CardHeader>
      </Card>

      {!assessmentDone.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Before your first check-in</CardTitle>
            <CardDescription>
              A short questionnaire about how you tend to feel in your relationship. About two minutes. There are no
              right answers, and you won't get a score or a label.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ButtonLink to="/assessment">
              Start
            </ButtonLink>
          </CardContent>
        </Card>
      ) : open && open.myStatus !== 'finished' ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {open.myStatus === 'not_started' ? 'Your check-in is open.' : 'Your check-in is in progress.'}
            </CardTitle>
            {open.partnerFinished && <CardDescription>{partnerName} has finished theirs.</CardDescription>}
          </CardHeader>
          <CardContent>
            <ButtonLink to={`/checkin/${open.id}`}>{open.myStatus === 'not_started' ? 'Start writing' : 'Continue'}</ButtonLink>
          </CardContent>
        </Card>
      ) : open ? (
        <Card>
          <CardHeader>
            <CardTitle>You've finished this week's check-in.</CardTitle>
            <CardDescription>
              {partnerName} hasn't finished yet. Their shares will appear when they do.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ButtonLink variant="outline" to={`/checkin/${open.id}/together`}>
              See what you shared
            </ButtonLink>
          </CardContent>
        </Card>
      ) : status.data?.due ? (
        <Card>
          <CardHeader>
            <CardTitle>It's time for your weekly check-in.</CardTitle>
          </CardHeader>
          <CardContent>
            <Button disabled={start.isPending} onClick={startAndGo}>
              Start check-in
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Next check-in: {status.data && formatDate(status.data.nextDate)}</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" disabled={start.isPending} onClick={startAndGo}>
              Start one now
            </Button>
          </CardContent>
        </Card>
      )}

      {checkins.data && checkins.data.length > 0 && <RecentCheckins checkins={checkins.data.slice(0, 5)} />}
    </>
  )
}

const STATUS_TEXT: Record<CheckinView['myStatus'], string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  finished: 'Finished',
}

function RecentCheckins({ checkins }: { checkins: CheckinView[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent check-ins</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid gap-2">
          {checkins.map((c) => (
            <li key={c.id}>
              <Link
                to={c.myStatus === 'finished' || c.closedAt ? `/checkin/${c.id}/together` : `/checkin/${c.id}`}
                className="flex justify-between gap-2 rounded-md p-2 text-sm hover:bg-muted"
              >
                <span>{formatDate(c.createdAt)}</span>
                <span className="text-muted-foreground">
                  {c.closedAt && c.myStatus !== 'finished' ? 'Closed' : STATUS_TEXT[c.myStatus]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
