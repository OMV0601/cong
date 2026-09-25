# Building Lexicon from nothing

Everything it took to get from a blank folder to a deployed app: where the idea
came from and what it beat, the product decisions and the reasoning behind each,
the full technical design, the build in phases, every bug that cost real time,
and the deployment runbook.

Written so that someone starting over could rebuild this — or build something
different and better — without repeating the wrong turns.

**Contents**

1. [Choosing what to build](#part-1--choosing-what-to-build) — the hardest part, and the part that nearly went wrong
2. [The product](#part-2--the-product) — four layers, one rule
3. [The technical design](#part-3--the-technical-design) — two kinds of reader, one database
4. [The build, phase by phase](#part-4--the-build-phase-by-phase)
5. [Deployment runbook](#part-5--deployment-runbook)
6. [Every bug that cost real time](#part-6--every-bug-that-cost-real-time)
7. [If you were starting over](#part-7--if-you-were-starting-over)

---

## Part 1 — Choosing what to build

Building is cheap now. Picking the right thing is not. Most of the value in this
project was created in the days before any code existed, and the ideas that got
rejected are more instructive than the one that survived.

### 1.1 The five candidates, and why four died

We started with five ideas carried over from earlier projects:

| Idea | Verdict |
|---|---|
| **Veya** — camera watches posture in children with cerebral palsy, alerts caregivers | Best of the five |
| **Katakan AI** — live captions and visual cues for deaf and hard-of-hearing users in meetings | Zoom, Teams and Meet all ship captions free |
| **NAVI** — computer vision navigation for blind pedestrians | Heavily built already. Seeing AI and Be My Eyes exist |
| **AI SpeechCompanion** — practice tool for people who stutter | Nothing visible happens. The value is deferred and unprovable |
| **Bloodchain** — blockchain blood supply chain | Infrastructure, not an app. The only thing to show is a dashboard of invented numbers |

Three failed on the same axis: **you cannot watch them work.** A practice
session is several minutes of nothing happening. A supply-chain dashboard is
made-up figures. If you can't show the payoff, someone has to take it on faith,
and people don't.

### 1.2 The test that actually mattered

Veya survived the first pass and still wasn't right. The objection that killed
it came from outside and was one sentence:

> *"The parent will get up regardless to check on their child."*

That's fatal. Veya made a hard thing slightly easier. It did not make a possible
thing out of an impossible one.

Which produced the rule that chose this project:

> **Could a determined, loving, well-resourced person do this today without an
> app?**
>
> If yes, you're building an *optimisation*.
> If no, you're building an *unlock*.
>
> **You want the no.**

Worked examples:

- A parent *can* turn their child at night. Exhausting, but possible. → optimisation
- An unconscious crash victim *cannot* tell a paramedic they're on blood thinners. No amount of effort fixes it. → unlock
- A stranger *cannot* learn a non-speaking person's private signal vocabulary in the moment. → unlock

Optimisations are worth building. They just don't make anyone sit up.

### 1.3 Where Lexicon came from

Apply that test across accessibility and one gap stands out.

Some people can't speak. They still communicate constantly — sounds, movements,
expressions. Their mother reads it fluently after fifteen years. A stranger
reads none of it.

The information exists. It's locked inside one person's head and has never been
written down in a form anyone else can use. So the moment that person is with a
stranger — an ER nurse at 2am, a substitute aide in September, a respite worker
— they effectively lose their voice. Not because they stopped communicating, but
because nobody in the room speaks their language.

That passes cleanly. A nurse cannot learn an idiosyncratic signal vocabulary in
the moment, however hard she tries, and the person cannot explain themselves.

### 1.4 Check who already built it — properly

This step gets skipped and shouldn't. What turned up:

| Prior art | How close |
|---|---|
| **PAMIS Digital Passport** (Scotland) | Very close. Uses "video, photography, sound and text" for people with profound multiple learning disabilities. Twenty years old |
| NHS digital Hospital Passports | Structured profiles — likes, dislikes, needs. No personal video |
| Communication passports (paper) | Standard practice across UK disability services |
| AAC apps (Proloquo2Go and similar) | Opposite direction: help the person speak *out* |

So: **not first.** That's normal and it's fine. Almost nothing is first.

What matters is finding the specific gap, and there was a clean one:

> **PAMIS built the dictionary. Nobody built the lookup.**

A passport is a profile you sit down and read to get to know someone. It answers
*"who is this person?"* It does not answer *"I am looking at this right now —
what is it?"*

Four things had no prior art at all:

1. Retrieval by someone who **cannot describe what they're seeing**
2. **Live escalation to the family** — nothing like it found anywhere
3. Labels anchored to **FLACC / NCCPC-R**, validated observational pain scales
   for people who can't self-report
4. Person-owned rather than hospital-system-owned

### 1.5 The gate, run honestly

Ten questions. Three weak answers kills an idea. Run it *before* writing code —
it takes ten minutes and can save six weeks.

| # | Question | Lexicon's answer | |
|---|---|---|---|
| 1 | What is the user physically holding when they'd open this? | A chart, a confused patient, a beeping monitor | ✓ |
| 2 | What happens within a week if they do nothing? | Pain goes unread. Wrong treatment | ✓ |
| 3 | Is there a deadline, dollar figure, form, penalty or supervisor? | Aides must be trained to the care plan *before services start*, with annual refresher | ✓ |
| 4 | Would they have paid a human to do this yesterday? | Yes — families pay for 1:1 aides who know the person | ✓ |
| 5 | At the climax, is what's on screen a *result* or a *process*? | A result: a clip, a meaning, an action | ✓ |
| 6 | Is there an external standard the output can be checked against? | FLACC (inter-rater reliability 0.87) and NCCPC-R | ✓ |
| 7 | Would someone use a crappy v1 from a team they've never heard of? | A parent who's had one bad hospital visit — yes | ✓ |
| 8 | Would *you* use it if you hadn't built it? | Yes | ✓ |
| 9 | Does it survive being retold badly? | "A nurse can look up what a non-verbal kid's sounds mean" | ✓ |
| 10 | Does the listener feel *"why didn't I think of that?"* | High. Everyone assumes hospitals solved this. They haven't | ✓ |

Question 5 is the one people fudge. A *process* is the app doing something. A
*result* is the user ending up holding something they didn't have before. If
your climax is a process, the idea is usually weaker than it feels.

---

## Part 2 — The product

### 2.1 The one rule

> **Lexicon never interprets. It only retrieves.**

No model decides what a signal means. The app surfaces candidates; a human
confirms against the person in front of them.

This is the most important decision in the project and it was made against the
grain. The obvious build — point a camera at the person, let a model match the
movement against the family's clips, output "that's the pain hum" — is flashier
and would have been easy to *claim*.

Three reasons not to:

**It would be wrong sometimes.** A false negative on a pain signal means a child
in pain gets left. A wrong reading is more dangerous than no reading.

**It doesn't work yet.** Few-shot matching of idiosyncratic movement, on bodies
that move atypically, from about five examples, is an open research problem.

**The refusal is the strongest thing you can say.** A clinician trusts a tool
that knows its limits. "We deliberately kept the human in the loop" is a
position. "Our AI detects pain" is a claim nobody can check.

Name the restraint. Don't hide it.

### 2.2 The four layers

Each exists because the one before it failed. That structure came from a real
objection — *"what if the nurse sees something she can't even describe? How does
she know what to type?"* — which broke the original search-box design entirely.

```
   Stranger scans the code
            │
   ┌────────▼────────┐
   │ 1. LOOK         │  Every clip, looping silently, all at once.
   │                 │  No words needed. Just look until one matches.
   └────────┬────────┘
            │ nothing matched
   ┌────────▼────────┐
   │ 2. POINT        │  Tap WHERE it's happening:
   │                 │  hands / face / legs / whole body / it's a sound
   │                 │  Thirty clips become four. Zero vocabulary.
   └────────┬────────┘
            │ still nothing
   ┌────────▼────────┐
   │ 3. ASK   ★      │  Film 5 seconds → send.
   │                 │  The family's phone buzzes. They reply.
   │                 │  The answer lands without a second tap.
   └────────┬────────┘
            │ nobody recognises it
   ┌────────▼────────┐
   │ 4. HONEST NO    │  "We don't recognise this one."
   │                 │  A real answer. Never a guess to seem useful.
   └─────────────────┘
```

Design notes that matter:

- **Layer 1 autoplays muted and looping.** Browsers only permit autoplay while
  muted. A wall of play buttons is not a grid anyone can scan.
- **Layer 2 only offers filters that would return something.** A dead end costs
  seconds the stranger doesn't have.
- **Sound is a separate axis from body region**, not one of its values. Someone
  can hum while rocking, so ticking "it's a sound" narrows *within* a region
  rather than replacing it.
- **Layer 4 exists because a guess dressed as help is worse than an admission.**

### 2.3 "Why can't the nurse just phone the parent?"

The first question anyone asks. It deserves a real answer, and the answer shaped
the product.

**Lexicon doesn't replace the phone call. Phone calls are layer 3 — and they're
the part it fixes.**

1. **A call makes you describe what you have no words for.** *"He's doing…
   something with his hand?"* Mum can't work with that. Video skips the
   describing step entirely.
2. **You have to know you're confused to make the call.** The nurse in the
   scenario isn't confused. She's confidently wrong — she's sure the rocking is
   anxiety. A grid of labelled clips is what tells her there was something to
   look up. This is the strongest of the five.
3. **A call costs minutes; an Ask costs seconds.** Find the number, dial,
   explain who and where you are, hold. People skip that on a maybe.
4. **The parent often isn't reachable.** Driving, asleep, in surgery after the
   same crash. For adults in group homes, parents may be elderly or gone.
5. **Nothing is retained.** Mum explains the hum, the shift changes, the next
   nurse starts from zero.

That last one produced a feature: **an answered Ask can be saved as a permanent
signal.** Lexicon gets smarter every time someone is confused. A phone call
evaporates.

**Say the limit out loud.** If Mum is standing right there, you ask Mum. Lexicon
is for the hours she isn't — every school day, every respite shift, every night
shift, every adult living away from family. That's most hours of most lives.

### 2.4 The idea we refused

Midway through, a good suggestion arrived: put a camera in the hospital room,
have it watch continuously, match against the family's clips automatically, and
use that to validate what the nurse concluded.

The instinct was right. The nurse's judgement is currently unvalidated, and a
second signal would build confidence. The implementation was wrong, for the
reasons in §2.1.

The honest version, which is what got built:

**Side-by-side confirmation.** The stranger films three seconds of what they're
actually looking at. Their clip and the family's clip play next to each other.
They decide. The confirmation is logged: *confirmed match, 3 Oct, Overlake ER.*

Real validation, performed by a person. Two videos side by side is legible at a
glance in a way a confidence score never is. It reuses the recorder already
built. And it produces a record, which is what actually creates trust.

> **Don't claim a feature you haven't built.** It's the defect someone technical
> finds in ninety seconds. Volunteering what's synthetic turns your weakest point
> into a credibility signal.

---

## Part 3 — The technical design

### 3.1 The problem that shapes everything

There are two kinds of reader and they cannot be protected the same way.

**Circle members** — family, named caregivers. Signed in, authorised by a row in
`circle_members`. Ordinary row-level security.

**Strangers** — an ER nurse, a substitute aide. **They have no account and will
never make one.** Requiring a signup is requiring failure: a nurse at 2am closes
the tab. They arrive holding a token from a QR code and nothing else.

That constraint drove every architectural decision that follows.

### 3.2 The trick that made it work

The obvious approach — pass the token with every request and validate it — falls
apart at Storage. Supabase Storage policies are SQL evaluated against the
request's role and claims. **They cannot read a token out of a URL.** Clips live
in a private bucket, so the grid would show nothing.

The solution:

1. Stranger opens `/c/:token`
2. The app signs them in **anonymously** — Supabase issues a real JWT with a
   real `auth.uid()` and the `authenticated` role
3. They call `claim_grant(token)`, which validates the code and writes a
   `grant_sessions` row binding that anonymous user to one person
4. Every policy — tables, Storage, Realtime — now checks *a row*, which is
   something SQL can actually do

The token stops travelling after the first call. Revoking a grant kills every
session derived from it instantly, because `has_grant_for()` re-checks the
parent grant on every call rather than trusting the session row it issued.

This also set up Layer 3 for free: an Ask needs a real `auth.uid()` for the
answer to travel back to that one stranger over Realtime.

### 3.3 Schema

Eight tables.

```sql
people             -- the non-speaking person. Everything hangs off this
signals            -- one clip = one dictionary entry
circle_members     -- who may see them, and who may answer an Ask
access_grants      -- the scannable code. Short-lived, revocable
grant_sessions     -- one row per stranger who opened a valid code
ask_requests       -- layer 3. One row per "what is this?"
push_subscriptions -- where a circle member's browser can be reached
access_log         -- every view. The family can see exactly who looked
```

Decisions worth copying:

- **`signals.search` is a generated `tsvector` column** with a GIN index.
  Full-text search with no separate index to maintain and no embeddings.
- **`signals.mime_type` stores what the browser actually recorded.** Chrome
  gives webm, Safari gives mp4. Storing the real value means playback never has
  to guess.
- **`signals.source_ask_id`** records that a signal was promoted from a question,
  so the lexicon's growth is traceable.
- **`access_log` has no INSERT policy at all.** Rows are written only by
  `security definer` functions, so the log can't be forged or suppressed by
  whoever is holding the token.

### 3.4 The security model

The core of it is one line:

```sql
revoke all on all tables in schema public from anon;
```

The `anon` role can `SELECT` nothing. Every read a stranger performs goes
through a `security definer` function that validates their grant first. Leaking
someone's signals would require a bug *inside one of those functions*, not a
forgotten policy on a table.

Every such function pins its search path:

```sql
set search_path = public, pg_temp
```

so it can't be hijacked by objects on a caller's path. (This is also what caused
the pgcrypto bug in Part 6 — the protection is real and it has a cost.)

The whole model is tested. `npm run test:rls` runs about forty assertions
against a live database holding **nothing but the publishable key that already
ships inside the JavaScript bundle** — the same power an attacker has. It proves
an anon caller reads nothing, a revoked token dies instantly, an expired one
too, and a grant holder for one person cannot reach another.

---

## Part 4 — The build, phase by phase

Every phase ends with something deployed and working. Nothing is "finished
later." That matters more than it sounds: you always have something to show, and
integration problems surface in week one rather than week five.

### Phase 0 — Foundation (half a day)

Vite + React 19 + TypeScript + Tailwind v4. Supabase project. Schema and RLS as
numbered migrations. Deployed.

Two things worth doing here and not later:

**Design tokens with the contrast ratios computed and written into the CSS**,
not eyeballed. The subject matter is accessibility; an inaccessible app would be
a bad joke.

**A status board** that checks each piece of plumbing from inside the running
app and names what's missing. When something breaks at 11pm, "is the database
even reachable" should be answered by the app, not by memory.

### Phase 1 — The dictionary (2 days)

Auth, add a person, record a clip in-browser, label it, see the grid.

The hard part is video. `MediaRecorder` behaves differently everywhere:

- Chrome records `video/webm;codecs=vp9`, Safari records `video/mp4;codecs=h264`.
  Feature-detect with `isTypeSupported`, pick best-first, store what you got.
- Poster frames must be extracted client-side, or the grid is blank while videos
  buffer — exactly the wrong first impression for someone who needs an answer in
  four seconds.
- Every grid video needs `muted` + `loop` + `autoPlay` + `playsInline`. Miss
  `playsInline` and iOS takes each tile fullscreen on play.

### Phase 2 — The stranger view (2 days)

QR grant creation with a label and a lifetime, revocation, and `/c/:token`
routed outside the auth gate — a nurse holding a code must never meet a sign-in
screen.

Lifetimes are **clamped, not rejected.** A code that never expires is the exact
failure this design exists to prevent, so an out-of-range value gets pulled into
range rather than erroring and tempting someone to skip the field.

### Phase 3 — Ask (3 days, the riskiest)

The full round trip: film → upload → the family's inbox → answer → back over
Realtime. Plus side-by-side confirmation and Layer 4.

Storage paths are the subtle part. Ask clips go to `<person_id>/asks/`, which
lets one policy grant a stranger write access to exactly one folder and nowhere
else. And a grant holder can read the family's clips but **not** other
strangers' Ask clips — that's video of a patient filmed by a stranger, and one
person's recording is nobody else's to browse. The asker doesn't need read
access; they still hold the blob they just recorded.

The waiting screen polls slowly *alongside* the Realtime subscription. A dropped
message means a nurse who gave up, which is the same as no answer at all.

### Phase 4 — Push, and everything orphaned

Web Push through a Deno edge function, plus the four capabilities that existed
in SQL with no button: promote-an-answer-to-a-signal, delete, the access log,
and search.

> Watch for this pattern generally. It's easy to build backend capability faster
> than interface, then forget the interface is missing. Four working features
> were invisible to users for a week.

The edge function is security-critical. It must verify the caller actually owns
the Ask before notifying anyone:

```ts
if (target.asker_user_id !== callerId) {
  return json({ error: 'unknown_ask' }, 404)
}
```

Note it returns `unknown_ask` rather than "forbidden" — a non-owner learns
nothing about whether that Ask exists. It also prunes subscriptions that answer
404 or 410, and never logs the VAPID private key.

Push is an accelerator, not the path. If it fails the Ask must still work,
because Realtime is the primary channel. Wrap the invoke in try/catch.

### Phase 5 — Ship

Design pass, demo seeding, accessibility audit, RLS test suite, landing page.

**Final shape:** ~6,000 lines of application code, ~1,700 of SQL across ten
migrations, ~1,700 of tooling, 91 tests.

---

## Part 5 — Deployment runbook

### Supabase

1. Create a project.
2. **Storage → New bucket** → name it exactly `signals` → **Public unchecked**.
3. **SQL Editor** → run every file in `supabase/migrations/` **in numerical
   order**. Paste one, Run, then the next.
4. **Authentication → Sign In / Providers → Email** → turn **off** "Confirm
   email" unless you want the inbox round trip.
5. Same page → enable **anonymous sign-ins**. Required — the stranger view
   cannot work without it.
6. **Authentication → URL Configuration** → Site URL = your deployed URL, and
   add `https://<domain>/**` to Redirect URLs. Skip this and confirmation links
   point at `localhost:3000`.
7. **Project Settings → API Keys** → copy the **publishable/anon** key.

> The publishable key is *meant* to be public — it ships inside the JS bundle.
> RLS is what protects the data. The secret / `service_role` key must never
> appear in the repo, the frontend, or a chat window.

### Web Push

```bash
npm run vapid
```

Public key → `.env.local` and your host's environment variables. Private key →
written to `.vapid-private.local`, git-ignored, and deliberately **never
printed**, because anything printed ends up in terminal scrollback, CI logs and
screen recordings.

```bash
supabase functions deploy notify-ask
supabase secrets set VAPID_PRIVATE_KEY="$(cat .vapid-private.local)"
supabase secrets set VAPID_SUBJECT="mailto:you@example.com"
supabase secrets set VAPID_PUBLIC_KEY="<the public key>"
rm .vapid-private.local
```

### Vercel

1. Import the repo. Preset: Vite. `vercel.json` already handles SPA rewrites and
   service-worker cache headers.
2. Environment Variables — exact names, all three:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY`
3. Mark them **not** sensitive. Vercel rejects `VITE_`-prefixed variables marked
   secret, because they're compiled into public output anyway.
4. **Redeploy.** Vite inlines env vars at *build* time — adding one does nothing
   until you rebuild.

### Verify

```bash
npm run seed:demo      # then put the printed code in VITE_DEMO_CODE, redeploy
npm run test:rls       # every assertion must pass against the live project
npm run audit:ui       # accessibility, measured rather than asserted
```

Then `/debug` on the deployed site — every row green. Then a full run on two
real devices, including **the phone buzzing with the browser closed.**

---

## Part 6 — Every bug that cost real time

| Symptom | Cause | Fix |
|---|---|---|
| `new row violates row-level security policy for table "people"` when adding a person | `INSERT ... RETURNING` applies the **SELECT** policy to the returned row. Circle membership didn't exist yet, so the row couldn't read itself back | Do both writes in one `security definer` function |
| Same error when **saving a signal** | Storage RLS is a **separate system** from table RLS. Table policies don't cover `storage.objects` | Write bucket policies explicitly |
| `function gen_random_bytes(integer) does not exist` | pgcrypto lives in the `extensions` schema; `security definer` functions pin `search_path = public, pg_temp` and can't see it | Use `gen_random_uuid()` (Postgres core) rather than widening the search path |
| Deployed app shows the setup checklist forever | Env vars missing, misnamed, or added without redeploying | Exact `VITE_` names, not marked secret, then **Redeploy** |
| Vercel rejects an env var as secret | `VITE_`-prefixed variables compile into public output | Mark it not sensitive |
| `Camera access was blocked` on a laptop | `facingMode: 'environment'` requests a rear camera a laptop lacks; and `audio: true` fails the **whole** request if only the mic is unavailable | Degrade through three attempts: ideal → plain → video-only |
| Recorded clip won't play back | `srcObject` always beats `src`. The live stream must be detached first | Clear `srcObject` before setting `src` |
| Grid tiles don't animate on mobile | Autoplay requires `muted`; without `playsInline`, iOS goes fullscreen per tile | All four attributes on every grid video |
| Confirmation email links to `localhost:3000` | Supabase **Site URL** still on its default | Auth → URL Configuration |
| Stranger view says the code is invalid | Anonymous sign-ins disabled | Auth → Providers |
| A generic "Could not add." hides the real problem | Error handling gated on `err instanceof Error`, so anything else fell through to a fallback string | One helper that extracts a message from any thrown value, preferring Postgres's `hint` field — for permission errors it contains the literal fix |

That last one is the meta-lesson. **The first bug took far longer than it should
have because the error handler was swallowing the real message.** Surface real
errors from day one; you'll spend the time either way, and you'd rather spend it
once.

---

## Part 7 — If you were starting over

**Spend disproportionate time on idea selection.** Days, not hours. Execution is
rarely the constraint. If the idea fails the impossible test, no amount of polish
fixes it.

**Write the climax as one sentence before writing any code.** "The nurse films
five seconds, and the answer appears on her screen without her touching it." If
that sentence is weak, the idea is weak regardless of how good the paragraph
around it sounds.

**Test the riskiest technical assumption in week one.** Push notifications on the
actual target device. The camera on the actual target laptop. Not in week five,
when there's no time to change course.

**Make errors loud early.** See above.

**Every phase ends deployed.** You always have something to show, and
integration problems surface while there's still room to fix them.

**Ask someone to break the idea.** The two best decisions here came from
objections — *"the parent will get up anyway"* killed a weaker project, and
*"what if she can't describe it?"* produced the four-layer structure that is now
the entire product.

**Say no to the impressive thing that doesn't work.** Automatic matching would
have been easy to claim and impossible to defend. Refusing it is the strongest
sentence in the whole pitch.

---

*Design rationale and the original plan: [`ARCHITECTURE.md`](ARCHITECTURE.md).
Setup, conventions and current state: [`../README.md`](../README.md).*
