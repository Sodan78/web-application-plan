import { ArrowLeft, ArrowRight, Ear, HeartHandshake, MessageCircle, Sparkles, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { promptLabel } from '@/features/checkin/copy'
import { useSession } from '@/features/auth/session'
import { useCheckin, useCouple, useShares, useViewerId } from '@/features/couple/hooks'
import type { Share } from '@/lib/data'

type Person = { id: string; name: string }

/** Listener prompts for one round (FR-36). `seconds` is a suggestion only (FR-37). */
const STEPS = [
  {
    key: 'share',
    icon: MessageCircle,
    who: 'sender',
    title: 'Share',
    seconds: 120,
    lines: ["Say one thing, starting with 'I'. Keep it short.", 'Talk about yourself, not about what they did wrong.'],
  },
  {
    key: 'mirror',
    icon: Ear,
    who: 'listener',
    title: 'Mirror',
    seconds: 90,
    lines: ['“What I hear you say is…”', '“Did I get that?”', '“Is there more?”'],
  },
  {
    key: 'validate',
    icon: HeartHandshake,
    who: 'listener',
    title: 'Validate',
    seconds: 60,
    lines: ['“That makes sense to me, because…”', 'You don’t have to agree, only to understand.'],
  },
  {
    key: 'empathise',
    icon: Sparkles,
    who: 'listener',
    title: 'Empathise',
    seconds: 60,
    lines: ['“I imagine you might feel…”', '“Is that right?”'],
  },
] as const

type Phase = { kind: 'setup' } | { kind: 'topic'; round: 0 | 1 } | { kind: 'step'; round: 0 | 1; step: number } | { kind: 'close' }

/** Imago-style guided dialogue for both partners on one device. Nothing is stored (FR-38). */
export function Talk() {
  const { id = '' } = useParams()
  const viewerId = useViewerId()
  const { profile } = useSession()
  const checkin = useCheckin(id)
  const shares = useShares(id)
  const couple = useCouple()

  if (checkin.isError) return <p>This check-in isn't available.</p>
  if (checkin.isPending || shares.isPending || couple.isPending) return null

  const c = checkin.data
  // Only after both have finished, while the couple is active (AC-4.1).
  if (!(c.myStatus === 'finished' && c.partnerFinished && c.coupleActive) || !couple.data) {
    return <Navigate to={`/checkin/${id}/together`} replace />
  }

  const me: Person = { id: viewerId, name: profile?.displayName ?? 'You' }
  const partner: Person = { id: couple.data.partner.id, name: couple.data.partner.displayName }
  const visible = (shares.data ?? []).filter((s) => s.withdrawnAt === null)

  return <Dialogue checkinId={id} me={me} partner={partner} shares={visible} />
}

export function Dialogue({ checkinId, me, partner, shares }: { checkinId: string; me: Person; partner: Person; shares: Share[] }) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' })
  const [first, setFirst] = useState<Person>(me)
  const [topics, setTopics] = useState<[string | null, string | null]>([null, null])
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus to each new screen's heading, for keyboard and screen reader users.
  useEffect(() => headingRef.current?.focus(), [phase])

  const senderOf = (round: 0 | 1) => (round === 0 ? first : first.id === me.id ? partner : me)
  const listenerOf = (round: 0 | 1) => (round === 0 ? (first.id === me.id ? partner : me) : first)
  const end = () => navigate(`/checkin/${checkinId}/together`)

  const next = () => {
    if (phase.kind === 'setup') setPhase({ kind: 'topic', round: 0 })
    else if (phase.kind === 'topic') setPhase({ kind: 'step', round: phase.round, step: 0 })
    else if (phase.kind === 'step') {
      if (phase.step < STEPS.length - 1) setPhase({ ...phase, step: phase.step + 1 })
      else if (phase.round === 0) setPhase({ kind: 'topic', round: 1 })
      else setPhase({ kind: 'close' })
    }
  }
  const back = () => {
    if (phase.kind === 'topic') setPhase(phase.round === 0 ? { kind: 'setup' } : { kind: 'step', round: 0, step: STEPS.length - 1 })
    else if (phase.kind === 'step') setPhase(phase.step > 0 ? { ...phase, step: phase.step - 1 } : { kind: 'topic', round: phase.round })
    else if (phase.kind === 'close') setPhase({ kind: 'step', round: 1, step: STEPS.length - 1 })
  }

  const progress =
    phase.kind === 'setup' ? 0 : phase.kind === 'close' ? 1 : phase.kind === 'topic' ? (phase.round * 5) / 10 : (phase.round * 5 + phase.step + 1) / 10

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">Talk it through</p>
          <p className="text-sm text-muted-foreground">Inspired by Imago dialogue. Take it slowly.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={end}>
          <X aria-hidden="true" />
          End
        </Button>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Dialogue progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} />
      </div>

      {phase.kind === 'setup' && (
        <Card>
          <CardHeader>
            <CardTitle ref={headingRef} tabIndex={-1} className="text-2xl outline-none">
              Sit together, somewhere quiet
            </CardTitle>
            <CardDescription>
              One of you shares, the other listens. Then you switch. The listener's job is to understand, not to reply.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <fieldset className="grid gap-2">
              <legend className="mb-2 font-medium">Who shares first?</legend>
              {[me, partner].map((p) => (
                <label
                  key={p.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 has-checked:border-primary has-checked:bg-accent/50"
                >
                  <input
                    type="radio"
                    name="first"
                    checked={first.id === p.id}
                    onChange={() => setFirst(p)}
                    className="accent-primary"
                  />
                  {p.id === me.id ? `${p.name} (you)` : p.name}
                </label>
              ))}
            </fieldset>
          </CardContent>
        </Card>
      )}

      {phase.kind === 'topic' && (
        <TopicPicker
          headingRef={headingRef}
          sender={senderOf(phase.round)}
          shares={shares.filter((s) => s.authorId === senderOf(phase.round).id)}
          value={topics[phase.round]}
          onChange={(v) => setTopics((t) => (phase.round === 0 ? [v, t[1]] : [t[0], v]))}
        />
      )}

      {phase.kind === 'step' && (
        <StepScreen
          key={`${phase.round}-${phase.step}`}
          headingRef={headingRef}
          step={STEPS[phase.step]}
          sender={senderOf(phase.round)}
          listener={listenerOf(phase.round)}
          topic={shares.find((s) => s.id === topics[phase.round])}
        />
      )}

      {phase.kind === 'close' && (
        <Card className="bg-linear-to-br from-[oklch(0.95_0.045_45)] via-card to-[oklch(0.95_0.035_355)]">
          <CardHeader>
            <CardTitle ref={headingRef} tabIndex={-1} className="text-2xl outline-none">
              Thank each other for listening
            </CardTitle>
            <CardDescription>
              What's one thing you'll take with you? Say it out loud, to each other. Nothing from this conversation is
              saved.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={back} disabled={phase.kind === 'setup'}>
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
        {phase.kind === 'close' ? (
          <Button onClick={end}>Finish</Button>
        ) : (
          <Button onClick={next}>
            {phase.kind === 'setup' ? 'Begin' : 'Next'}
            <ArrowRight aria-hidden="true" />
          </Button>
        )}
      </div>
    </>
  )
}

function TopicPicker({
  headingRef,
  sender,
  shares,
  value,
  onChange,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  sender: Person
  shares: Share[]
  value: string | null
  onChange: (v: string | null) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle ref={headingRef} tabIndex={-1} className="text-2xl outline-none">
          {sender.name}, what would you like to talk about?
        </CardTitle>
        <CardDescription>Pick something you shared, or anything else that's on your mind.</CardDescription>
      </CardHeader>
      <CardContent>
        <fieldset className="grid gap-2">
          <legend className="sr-only">Topic</legend>
          {shares.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 has-checked:border-primary has-checked:bg-accent/50"
            >
              <input
                type="radio"
                name="topic"
                checked={value === s.id}
                onChange={() => onChange(s.id)}
                className="mt-1 accent-primary"
              />
              <span className="grid gap-0.5">
                <span className="text-xs font-medium text-muted-foreground">{promptLabel(s.prompt)}</span>
                <span className="text-sm">{s.body}</span>
              </span>
            </label>
          ))}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 has-checked:border-primary has-checked:bg-accent/50">
            <input
              type="radio"
              name="topic"
              checked={value === null}
              onChange={() => onChange(null)}
              className="accent-primary"
            />
            <span className="text-sm">Something else</span>
          </label>
        </fieldset>
      </CardContent>
    </Card>
  )
}

function StepScreen({
  headingRef,
  step,
  sender,
  listener,
  topic,
}: {
  headingRef: React.RefObject<HTMLHeadingElement | null>
  step: (typeof STEPS)[number]
  sender: Person
  listener: Person
  topic: Share | undefined
}) {
  const speaker = step.who === 'sender' ? sender : listener
  const Icon = step.icon

  return (
    <Card>
      <CardHeader className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon aria-hidden="true" className="size-6" />
        </span>
        <div className="grid gap-1">
          <p className="text-sm text-muted-foreground">{speaker.name} speaks</p>
          <CardTitle ref={headingRef} tabIndex={-1} className="text-3xl outline-none">
            {step.title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="grid gap-5">
        {step.key === 'share' && topic && (
          <blockquote className="rounded-xl border-l-4 border-primary/60 bg-muted/60 p-3 text-sm">
            <span className="block text-xs font-medium text-muted-foreground">{promptLabel(topic.prompt)}</span>
            {topic.body}
          </blockquote>
        )}
        <ul className="grid gap-2 font-heading text-xl">
          {step.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {step.who === 'listener' && (
          <p className="text-sm text-muted-foreground">
            {sender.name}: listen, then say “yes, that’s it” or add what’s missing.
          </p>
        )}
        <GentleTimer seconds={step.seconds} />
      </CardContent>
    </Card>
  )
}

/** Shows time spent against a suggestion. Never beeps or stops anyone (FR-37). */
function GentleTimer({ seconds }: { seconds: number }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => window.clearInterval(t)
  }, [])
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const ratio = Math.min(elapsed / seconds, 1)

  return (
    <div className="grid gap-1.5">
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-chart-2 transition-all duration-1000" style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">
        {fmt(elapsed)} · about {fmt(seconds)} suggested{elapsed > seconds ? ', take the time you need' : ''}
      </p>
    </div>
  )
}
