import { Link } from 'react-router-dom'
import { ArrowRight, Eye, Hand, HelpCircle, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { env } from '@/lib/env'
import { useDocumentTitle } from '@/lib/use-document-title'

const LAYERS = [
  {
    icon: Eye,
    name: 'Look',
    line: 'A grid of short clips, all looping, no sound.',
    detail:
      'Most of the time the answer is right there. You are not reading a list of words — you are looking for the thing you can already see.',
  },
  {
    icon: Hand,
    name: 'Point',
    line: 'Tap where it is happening. Hands, face, legs, whole body, a sound.',
    detail:
      'You do not have to describe anything. The premise of this layer is that you cannot — you have no words for what they are doing. You can always point.',
  },
  {
    icon: Video,
    name: 'Ask',
    line: 'Film five seconds. Send it. The family answers on their phone.',
    detail:
      'You do not have to explain it over the phone. You just show them. The answer comes back to the screen in your hand, and it gets kept, so the next shift never asks again.',
  },
  {
    icon: HelpCircle,
    name: 'An honest no',
    line: '“We don’t recognise this one.”',
    detail:
      'A real answer. Lexicon would rather tell you it does not know than hand a clinician a confident guess about someone’s pain.',
  },
]

/**
 * The public front door.
 *
 * Everyone who arrives here arrives cold: a judge, a teacher, a parent someone
 * forwarded this to. None of them know what a "signal" is yet, and none of them
 * will make an account to find out. So this page has one job — make the problem
 * legible in about fifteen seconds — and exactly one real call to action, which
 * is to go and use the stranger's side without signing up for anything.
 *
 * The demo code is optional on purpose. Without VITE_DEMO_CODE set, this page
 * still works and simply does not offer a tour; it never shows a button that
 * leads to an expired grant, which is a worse first impression than no button.
 */
export default function Landing() {
  useDocumentTitle('Lexicon — a vocabulary a stranger can read')
  const demo = env.demoCode

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4 px-4 py-5">
        <span className="text-lg font-semibold tracking-tight">Lexicon</span>
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-fg-muted underline underline-offset-4 hover:text-fg"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 pb-20">
        <section className="border-b border-border pt-6 pb-12">
          <h1 className="max-w-2xl text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
            Every non-speaking person has a vocabulary. It just lives in one
            person&rsquo;s head.
          </h1>
          <div className="mt-6 max-w-prose space-y-4 text-base text-fg-muted">
            <p>
              Some people can&rsquo;t speak. They still communicate — through
              sounds, movements and expressions. Their family reads it fluently
              after years. A stranger reads none of it.
            </p>
            <p>
              So the moment they&rsquo;re with someone new — an ER nurse at
              11pm, a substitute aide, a respite worker — they effectively lose
              their voice. Not because they stopped communicating, but because
              nobody in the room speaks their language.
            </p>
            <p className="text-fg">
              Lexicon lets a family record short labelled clips of the real
              signals while they&rsquo;re at home and calm, and lets a stranger
              find the right one in the moment — or, when nothing matches, reach
              the family live.
            </p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {demo && (
              <Button asChild size="lg">
                <Link to={`/c/${demo}`}>
                  See a real lexicon <ArrowRight aria-hidden />
                </Link>
              </Button>
            )}
            <Button asChild size="lg" variant={demo ? 'outline' : 'primary'}>
              <Link to="/signin">Start one for someone</Link>
            </Button>
          </div>
          {demo && (
            <p className="mt-3 text-xs text-fg-muted">
              Opens the stranger&rsquo;s side, exactly as a nurse would see it.
              No account, no install. It is demo data, and it says so on the
              screen.
            </p>
          )}
        </section>

        <section className="border-b border-border py-12">
          <h2 className="text-xl font-semibold tracking-tight">
            What the stranger does
          </h2>
          <p className="mt-2 max-w-prose text-sm text-fg-muted">
            Four layers. Each one exists because the one before it failed.
          </p>

          <ol className="mt-8 grid gap-4 sm:grid-cols-2">
            {LAYERS.map((layer, i) => (
              <li
                key={layer.name}
                className="rounded-[var(--radius)] border border-border bg-surface p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft">
                    <layer.icon className="size-4 text-accent" aria-hidden />
                  </span>
                  <h3 className="font-medium">
                    <span className="text-fg-muted">{i + 1}.</span> {layer.name}
                  </h3>
                </div>
                <p className="mt-3 font-medium">{layer.line}</p>
                <p className="mt-1.5 text-sm text-fg-muted">{layer.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="py-12">
          <h2 className="text-xl font-semibold tracking-tight">The one rule</h2>
          <blockquote className="mt-4 border-l-2 border-accent pl-4 text-lg">
            Lexicon never interprets. It only retrieves.
          </blockquote>
          <div className="mt-4 max-w-prose space-y-4 text-sm text-fg-muted">
            <p>
              No model decides what a signal means. The app surfaces candidates
              and a human confirms them against the person in front of them —
              side by side, their own clip next to the family&rsquo;s.
            </p>
            <p>
              We could have built a camera that watches someone and announces
              &ldquo;that&rsquo;s the pain hum.&rdquo; We deliberately
              didn&rsquo;t. A wrong automatic pain reading is more dangerous
              than no reading at all, and refusing to guess is what makes
              everything else here trustworthy.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-fg-muted">
          <p>Built for the Congressional App Challenge.</p>
          <a
            href="https://github.com/OMV0601/cong"
            className="underline underline-offset-4 hover:text-fg"
          >
            Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
