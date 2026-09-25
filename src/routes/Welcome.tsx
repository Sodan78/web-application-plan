import { Lock, MessageCircleHeart, PenLine } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { ButtonLink } from '@/components/ButtonLink'
import { Logo } from '@/components/Logo'
import { useSession } from '@/features/auth/session'

const STEPS = [
  { icon: PenLine, title: 'Reflect privately', text: 'Each of you writes on your own. Nothing is shared by default.' },
  { icon: Lock, title: 'Choose what to share', text: 'Pick what your partner sees. You can take it back any time.' },
  { icon: MessageCircleHeart, title: 'Talk together', text: 'See what you both shared, with a gentle question to start.' },
]

export function Welcome() {
  const { session, loading } = useSession()
  if (loading) return null
  if (session) return <Navigate to="/" replace />

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-8">
        <Logo />
        <ButtonLink variant="ghost" to="/sign-in">
          Sign in
        </ButtonLink>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 sm:px-8">
        <section className="grid gap-6 py-12 sm:py-20">
          <p className="text-sm font-medium tracking-wide text-primary uppercase">For couples in therapy</p>
          <h1 className="max-w-2xl text-4xl leading-tight sm:text-6xl">
            A calm place to understand each other, one check-in at a time.
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Private reflections, shared by choice. Notice your patterns together, and bring what you learn to your
            sessions.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink size="lg" to="/sign-up">
              Create account
            </ButtonLink>
            <ButtonLink size="lg" variant="outline" to="/sign-in">
              Sign in
            </ButtonLink>
          </div>
        </section>

        <section aria-labelledby="how-it-works" className="grid gap-6">
          <h2 id="how-it-works" className="text-2xl">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                data-slot="card"
                className="grid gap-3 rounded-2xl bg-card/80 p-6 ring-1 ring-foreground/5 backdrop-blur"
              >
                <span className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <step.icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="text-lg">
                  <span className="sr-only">Step {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Couples Unite supports your therapy. It isn't therapy, and it doesn't diagnose.
        </p>
      </main>
    </div>
  )
}
