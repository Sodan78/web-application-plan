import { CalendarHeart, ClipboardList, Hourglass, Mail, NotebookPen, PenLine, UserPlus, Users } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { ActionCard } from '@/components/ActionCard'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useSession } from '@/features/auth/session'
import { InviteDialog } from '@/features/couple/InviteDialog'
import { repo, type CheckinView, type PairRequestView } from '@/lib/data'

export function Home() {
  const couple = useCouple()
  const requests = usePairRequests()
  const endNotice = useEndNotice()
  const dismissNotice = useViewerMutation<void>((viewerId) => repo.dismissEndNotice(viewerId))

  const { profile } = useSession()

  if (couple.isPending || requests.isPending) return null

  const incoming = requests.data?.filter((r) => r.direction === 'incoming') ?? []
  const outgoing = requests.data?.find((r) => r.direction === 'outgoing')

  return (
    <>
      <div className="grid gap-1">
        <h1 className="text-3xl sm:text-4xl">
          {greeting()}, {profile?.displayName}
        </h1>
        <p className="text-muted-foreground">Take a breath. This is your space.</p>
      </div>

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
        <ActionCard
          highlight
          icon={UserPlus}
          title="You're not linked with a partner yet."
          description="Invite your partner to start doing check-ins together."
        >
          <InviteDialog />
        </ActionCard>
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
    <ActionCard highlight icon={Mail} title={`${request.otherName} would like to link with you.`}>
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
    </ActionCard>
  )
}

function greeting() {
  const hour = new Date().getHours()
  return hour < 5 ? 'Good evening' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
}

function OutgoingRequest({ request }: { request: PairRequestView }) {
  const cancel = useViewerMutation<void>((viewerId) => repo.cancelPairRequest(viewerId, request.id))

  return (
    <ActionCard
      icon={Hourglass}
      title={`Waiting for ${request.otherName} to accept.`}
      description="They'll see your request after signing in with that email."
    >
      <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
        Cancel request
      </Button>
    </ActionCard>
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
      {!assessmentDone.data ? (
        <ActionCard
          highlight
          icon={ClipboardList}
          title="Before your first check-in"
          description="A short questionnaire about how you tend to feel in your relationship. About two minutes. There are no right answers, and you won't get a score or a label."
        >
          <ButtonLink size="lg" to="/assessment">
            Start
          </ButtonLink>
        </ActionCard>
      ) : open && open.myStatus !== 'finished' ? (
        <ActionCard
          highlight
          icon={PenLine}
          title={open.myStatus === 'not_started' ? 'Your check-in is open.' : 'Your check-in is in progress.'}
          description={open.partnerFinished ? `${partnerName} has finished theirs.` : 'Write privately first. You choose what to share at the end.'}
        >
          <ButtonLink size="lg" to={`/checkin/${open.id}`}>
            {open.myStatus === 'not_started' ? 'Start writing' : 'Continue'}
          </ButtonLink>
        </ActionCard>
      ) : open ? (
        <ActionCard
          icon={Hourglass}
          title="You've finished this week's check-in."
          description={`${partnerName} hasn't finished yet. Their shares will appear when they do.`}
        >
          <ButtonLink variant="outline" to={`/checkin/${open.id}/together`}>
            See what you shared
          </ButtonLink>
        </ActionCard>
      ) : status.data?.due ? (
        <ActionCard
          highlight
          icon={NotebookPen}
          title="It's time for your weekly check-in."
          description="Ten quiet minutes for yourself, then see what you both shared."
        >
          <Button size="lg" disabled={start.isPending} onClick={startAndGo}>
            Start check-in
          </Button>
        </ActionCard>
      ) : (
        <ActionCard icon={CalendarHeart} title={`Next check-in: ${status.data ? formatDate(status.data.nextDate) : ''}`}>
          <Button variant="outline" disabled={start.isPending} onClick={startAndGo}>
            Start one now
          </Button>
        </ActionCard>
      )}

      <ActionCard
        icon={Users}
        title={`You're linked with ${partnerName}.`}
        description="Your reflections stay private unless you choose to share them."
      />

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
