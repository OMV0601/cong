import { Link } from 'react-router-dom'
import { ArrowRight, Check, Eye, Hand, HelpCircle, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { env } from '@/lib/env'
import { DEMO_CLIPS, clipBySlug, type DemoClip } from '@/lib/demo-clips'
import { useDocumentTitle } from '@/lib/use-document-title'
import { useReducedMotion } from '@/lib/use-reduced-motion'
import { cn } from '@/lib/utils'

/**
 * The public front door.
 *
 * Everyone arrives cold: a judge, a teacher, a parent someone forwarded this
 * to. None of them know what a "signal" is, and none of them will make an
 * account to find out.
 *
 * So the page shows the product rather than describing it. The clips are real
 * files playing in a real grid — the same thing a nurse sees after scanning a
 * code — because a wall of prose about video is a poor way to explain video.
 * The argument the whole project rests on, that two hums a stranger cannot
 * separate are obvious side by side, is made by putting them side by side.
 *
 * It stays inside the same constraints as the rest of the app: one accent, no
 * gradients, no glassmorphism, no decorative animation, red reserved for
 * urgency. Serious does not mean loud. The weight comes from typographic scale,
 * a dark band for the two narrative moments, and generous space — not from
 * ornament, which would be exactly wrong for something that sits next to a
 * hospital bed.
 */

const LAYERS = [
  {
    icon: Eye,
    name: 'Look',
    line: 'A grid of short clips, all looping, no sound.',
    detail:
      'Most of the time the answer is already on the screen. You are not reading a list of words — you are looking for the thing in front of you.',
    failure: 'Nothing looked familiar',
  },
  {
    icon: Hand,
    name: 'Point',
    line: 'Tap where it is happening. Hands, face, legs, whole body, a sound.',
    detail:
      'You do not have to describe anything, because the premise of this layer is that you cannot. You have no words for what they are doing. You can always point.',
    failure: 'Still nothing',
  },
  {
    icon: Video,
    name: 'Ask',
    line: 'Film five seconds. Send it. Their phone lights up.',
    detail:
      'You do not explain it down a phone line — you show them. The answer comes back to the screen in your hand, and the family can keep it, so the next person on the next shift never has to ask again.',
    failure: 'Nobody recognises it',
  },
  {
    icon: HelpCircle,
    name: 'An honest no',
    line: '“We don’t recognise this one.”',
    detail:
      'A real answer, and the one most systems refuse to give. Lexicon would rather tell a clinician it does not know than hand them a confident guess about someone’s pain.',
    failure: null,
  },
]

const EVIDENCE = [
  {
    stat: 'No account',
    line: 'A stranger scans a code and reads. Nothing to install, nothing to sign up for, nothing to remember at 3am.',
  },
  {
    stat: 'Expires and revokes',
    line: 'Codes are short-lived by default, and revoking one kills the session already open on someone else’s screen.',
  },
  {
    stat: 'Every view logged',
    line: 'The family sees who opened a code, when, and what they concluded. Nobody can switch that off — not the code holder, not us.',
  },
  {
    stat: 'Anchored to FLACC',
    line: 'Signals can be tagged against the observational pain scale clinicians already use, so a meaning is not resting on one family’s wording.',
  },
]

/** One clip, shown the way the app shows it. */
function Clip({
  clip,
  still,
  className,
}: {
  clip: DemoClip
  still: boolean
  className?: string
}) {
  const shared = 'size-full object-cover'
  return (
    <div
      className={cn(
        'relative aspect-square w-full overflow-hidden bg-band',
        className
      )}
    >
      {still ? (
        <img src={clip.poster} alt={`Still frame from ${clip.label}`} className={shared} />
      ) : (
        <video
          src={clip.src}
          poster={clip.poster}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          aria-hidden
          className={shared}
        />
      )}
      {clip.urgency === 'urgent' && (
        <span className="absolute top-2 left-2 rounded-full bg-urgent px-2 py-0.5 text-xs font-medium text-urgent-fg">
          Urgent
        </span>
      )}
    </div>
  )
}

function Tile({ clip, still }: { clip: DemoClip; still: boolean }) {
  return (
    <li className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface">
      <Clip clip={clip} still={still} className="border-b border-border" />
      <div className="space-y-0.5 px-3 py-2.5">
        <p className="text-sm font-medium">{clip.label}</p>
        <p className="line-clamp-2 text-sm text-fg-muted">{clip.meaning}</p>
        <p className="text-xs text-fg-muted">
          {clip.isSound && 'Sound · '}
          {clip.region}
        </p>
      </div>
    </li>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-[0.12em] text-fg-muted uppercase">
      {children}
    </p>
  )
}

export default function Landing() {
  useDocumentTitle('Lexicon — a vocabulary a stranger can read')
  const demo = env.demoCode
  const still = useReducedMotion()

  const pain = clipBySlug('pain-hum')
  const anxious = clipBySlug('anxious-hum')

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-bg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-base font-semibold tracking-tight">Lexicon</span>
          <nav className="flex items-center gap-1">
            <Button asChild variant="ghost">
              <Link to="/signin">Sign in</Link>
            </Button>
            {demo && (
              <Button asChild>
                <Link to={`/c/${demo}`}>See it</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* ---------------------------------------------------------------- */}
        {/* Hero — the claim, then immediately the thing itself.              */}
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto w-full max-w-6xl px-4 pt-14 pb-16 sm:pt-20">
          <Eyebrow>For people who don’t speak with words</Eyebrow>
          <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Every <span className="whitespace-nowrap">non-speaking</span>{' '}
            person has a vocabulary. It just lives in one person’s head.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-fg-muted">
            Their family reads it fluently after years. A stranger reads none of
            it — so the moment they’re with someone new, an ER nurse at 11pm, a
            substitute aide, a respite worker, they effectively lose their voice.
          </p>
          <p className="mt-4 max-w-2xl text-lg">
            Lexicon lets a family record what the real signals mean while
            they’re home and calm, and lets a stranger find the right one in the
            moment.
          </p>

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

          {/* The product, not a screenshot of it. */}
          <div className="mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
              <Eyebrow>What the stranger sees</Eyebrow>
              <p className="text-xs text-fg-muted">
                No account · no install · expires on its own
              </p>
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {DEMO_CLIPS.map((clip) => (
                <Tile key={clip.slug} clip={clip} still={still} />
              ))}
            </ul>
            <p className="mt-4 max-w-prose text-xs text-fg-muted">
              These clips are abstract animations, not footage of anybody. A
              real lexicon holds short videos of the person themselves, recorded
              by the people who know them.
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* The scene. Fixed dark in both themes — it is 11pm either way.     */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-y border-band-border bg-band text-band-fg">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:py-28">
            <div className="max-w-3xl">
              <Eyebrow>
                <span className="text-band-muted">Why this exists</span>
              </Eyebrow>
              <div className="mt-6 space-y-5 text-xl leading-relaxed sm:text-2xl">
                <p>
                  It’s eleven at night. A teenager who can’t speak is rocking
                  back and forth in an emergency room. The nurse has never met
                  her, and writes down{' '}
                  <span className="text-band-muted italic">anxious</span>.
                </p>
                <p className="font-medium">She’s wrong.</p>
                <p>
                  The rocking means her stomach hurts. Her mother would have
                  known in a second — but her mother isn’t in the room, and the
                  nurse doesn’t know there was anything to look up.
                </p>
              </div>
              <p className="mt-8 max-w-2xl text-base text-band-muted">
                That last part is the hard one. She isn’t confused, so she’d
                never think to call. A grid of labelled clips is what tells her
                there was a question here at all.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* The argument, made visually rather than in prose.                 */}
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20">
          <Eyebrow>The whole problem, in two clips</Eyebrow>
          <h2 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Her mother has never once confused these. A stranger can’t tell them
            apart from a description.
          </h2>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {[pain, anxious].map((clip) => (
              <figure
                key={clip.slug}
                className="overflow-hidden rounded-[var(--radius)] border border-border bg-surface"
              >
                <Clip clip={clip} still={still} className="border-b border-border" />
                <figcaption className="p-5">
                  <p className="text-base font-medium">{clip.label}</p>
                  <p className="mt-2 text-sm text-fg-muted">{clip.meaning}</p>
                </figcaption>
              </figure>
            ))}
          </div>

          <p className="mt-8 max-w-2xl text-base text-fg-muted">
            Written down, they’re nearly the same sentence. Side by side, they
            aren’t the same thing at all. That gap is the reason Lexicon stores
            video instead of descriptions — and the reason a phone call, where
            you have to put it into words, so often fails.
          </p>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Four layers, as an escalation rather than four equal cards.       */}
        {/* ---------------------------------------------------------------- */}
        {/* Deliberately on the page background rather than a raised surface.
            It sits immediately above the dark band, and in dark mode a raised
            surface and the band land within 1.07:1 of each other — the two
            sections merge into one slab and the rhythm disappears. Hairlines
            do the separating here instead. */}
        <section className="border-y border-border">
          <div className="mx-auto w-full max-w-6xl px-4 py-20">
            <Eyebrow>What the stranger does</Eyebrow>
            <h2 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Four layers. Each one exists because the one before it failed.
            </h2>

            <ol className="mt-12 space-y-0">
              {LAYERS.map((layer, i) => (
                <li key={layer.name}>
                  <div className="grid gap-4 sm:grid-cols-[4rem_2.5rem_1fr] sm:gap-6">
                    <p
                      className="text-3xl font-semibold text-fg-muted tabular-nums sm:text-4xl"
                      aria-hidden
                    >
                      {String(i + 1).padStart(2, '0')}
                    </p>
                    <span className="hidden size-10 shrink-0 place-items-center rounded-full border border-border bg-surface sm:grid">
                      <layer.icon className="size-4 text-accent" aria-hidden />
                    </span>
                    <div className="max-w-2xl">
                      <h3 className="text-lg font-medium">{layer.name}</h3>
                      <p className="mt-1.5 text-base">{layer.line}</p>
                      <p className="mt-2 text-sm text-fg-muted">
                        {layer.detail}
                      </p>
                    </div>
                  </div>

                  {layer.failure && (
                    <p className="my-5 flex items-center gap-3 text-xs text-fg-muted sm:ml-[5.5rem]">
                      <span className="h-px w-8 bg-border" aria-hidden />
                      {layer.failure}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* The one rule.                                                     */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-y border-band-border bg-band text-band-fg">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:py-24">
            <Eyebrow>
              <span className="text-band-muted">The one rule</span>
            </Eyebrow>
            <blockquote className="mt-6 max-w-4xl border-l-2 border-band-accent pl-6 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Lexicon never interprets. It only retrieves.
            </blockquote>
            <div className="mt-8 grid max-w-4xl gap-6 text-base text-band-muted sm:grid-cols-2">
              <p>
                No model decides what a signal means. The app surfaces
                candidates, and a human confirms them side by side — their own
                clip next to the family’s — against the person in front of them.
                What gets recorded is what a <em>person</em> concluded.
              </p>
              <p>
                We could have built a camera that watches someone and announces
                “that’s the pain hum.” We deliberately didn’t. A wrong automatic
                pain reading is more dangerous than no reading at all, and
                refusing to guess is what makes everything else here worth
                trusting.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Evidence, quietly.                                                */}
        {/* ---------------------------------------------------------------- */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20">
          <Eyebrow>Built for somewhere serious</Eyebrow>
          <h2 className="mt-4 max-w-3xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            This holds a private medical vocabulary. It’s treated that way.
          </h2>
          <dl className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {EVIDENCE.map((item) => (
              <div key={item.stat} className="border-t border-border pt-4">
                <dt className="flex items-center gap-2 text-base font-medium">
                  <Check className="size-4 shrink-0 text-accent" aria-hidden />
                  {item.stat}
                </dt>
                <dd className="mt-2 text-sm text-fg-muted">{item.line}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Close.                                                            */}
        {/* ---------------------------------------------------------------- */}
        <section className="border-t border-border bg-surface-2">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 text-center">
            <h2 className="mx-auto max-w-3xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              Somebody already knows what every one of these means. They just
              can’t be in the room every time.
            </h2>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
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
              <p className="mt-4 text-sm text-fg-muted">
                Opens the stranger’s side, exactly as a nurse would see it.
              </p>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-8 text-xs text-fg-muted">
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
