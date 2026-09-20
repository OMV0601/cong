# Lexicon

> Every non-speaking person has a vocabulary. It just lives in one person's head.

Some people can't speak. They still communicate — through sounds, movements and
expressions. Their family reads it fluently after years. A stranger reads none
of it.

So the moment they're with a stranger — an ER nurse, a new school aide, a
respite worker — they effectively lose their voice. Not because they stopped
communicating, but because nobody in the room speaks their language.

Lexicon lets a family record short labelled clips of the person's real signals
while they're at home and calm, and lets a stranger find the right one **in the
moment** — or, when nothing matches, reach the family live.

**Built for the Congressional App Challenge 2026 (WA-08). Deadline: Oct 26, 12:00pm ET.**

---

## The one rule

> **Lexicon never interprets. It only retrieves.**

No model decides what a signal means. The app surfaces candidates; a human
confirms against the person in front of them. A wrong automatic pain reading is
more dangerous than no reading, and refusing to guess is what makes the rest of
this trustworthy.

**If you are continuing this project: do not add automatic signal matching.**
It is the single change that would undo the product's credibility. The honest
version — side-by-side comparison judged by a person — is already built. See
[Task 9](#task-9--dont-do-this) at the bottom.

---

## The four layers

Everything the stranger does is one of these. Each exists because the one
before it failed.

```
   Stranger scans the code
            │
   ┌────────▼────────┐
   │ 1. LOOK         │  Grid of clips, all looping silently.
   │                 │  Just look until one matches.
   └────────┬────────┘
            │ nothing matched
   ┌────────▼────────┐
   │ 2. POINT        │  Tap WHERE it's happening:
   │                 │  hands / face / legs / body / it's a sound
   │                 │  Zero vocabulary needed.
   └────────┬────────┘
            │ still nothing
   ┌────────▼────────┐
   │ 3. ASK   ★      │  Film 5 seconds → send.
   │                 │  Family's phone lights up. They reply.
   │                 │  Answer lands on the stranger's screen.
   └────────┬────────┘
            │ nobody knows
   ┌────────▼────────┐
   │ 4. HONEST NO    │  "We don't recognise this one."
   │                 │  Never guesses to seem useful.
   └─────────────────┘
```

**Why not just phone the parent?** Because a call makes you describe something
you have no words for; because you have to already know you're confused to make
it; because it costs minutes an Ask costs seconds; because the parent is often
unreachable; and because nothing is retained — the next shift starts from zero.
Lexicon doesn't replace the call. It *is* the call, made cheap and kept.

---

## Current state

Everything below is built and working. The four layers, the code-sharing, the
notifications, the activity log and the growth loop are all in the app — not in
a plan.

### The family's side
- Email/password sign-in, sign-up, and "continue as guest" (anonymous auth)
- Add a person, record a clip in-browser and label it: name, meaning, body
  region, is-it-a-sound, urgency, optional FLACC category
- A grid of looping clips with per-clip audio, delete with confirmation, and
  full-text search
- Share codes with a label and a lifetime, shown as a QR, copyable, revocable
- An inbox of pending questions, with a live count on the person page and in
  the browser tab
- **Web Push** — the phone buzzes with the browser closed
- **Save an answer as a signal**, so a question asked once is never asked again
- **An activity log** — who opened a code, when, and what they concluded

### The stranger's side (`/c/:token`, no account, no install)
- Layer 1: the grid, looping silently
- Layer 2: filters that only ever offer a choice that returns something
- Layer 3: film → send → the answer arrives over Realtime with no refresh
- Layer 4: the family can answer "we don't recognise it"
- Side-by-side confirmation, judged by the person holding the phone and logged
  as what *they* concluded
- Search, deliberately below Look and Point

### Not built, on purpose
- **Automatic signal matching.** See [the one rule](#the-one-rule). This is a
  decision, not a gap.

### Not built, still wanted
- Multiple caregivers per person with roles (the schema supports it; there is
  no invite UI)
- Offline caching of a lexicon before a hospital visit
- A printable one-page version for the bedside

### Before you can demo it
Four migrations and one edge function are not applied to a fresh project by
default. See [Quickstart](#quickstart) and
[Push notifications](#push-notifications), then open `/debug`, which names
whatever is still missing.

## Quickstart

```bash
git clone https://github.com/OMV0601/cong.git
cd cong
npm install
cp .env.example .env.local     # fill in from Supabase, see below
npm run dev
```

Open <http://localhost:5173>. If the backend isn't configured you'll land on a
status board that checks every piece of plumbing and names what's missing.

### Supabase setup (about 10 minutes)

1. Create a project at [supabase.com](https://supabase.com).
2. **Storage → New bucket** → name it exactly `signals` → leave **Public
   unchecked**.
3. **SQL Editor** → run every file in `supabase/migrations/` **in numerical
   order**. Paste one, Run, then the next. Expect "Success. No rows returned."

   | File | What it does |
   |---|---|
   | `0001_schema.sql` | 7 tables, enums, full-text search column |
   | `0002_rls.sql` | Row-Level Security on every table |
   | `0003_create_person_fix.sql` | Atomic person + circle creation |
   | `0004_storage_policies.sql` | Storage RLS for the `signals` bucket |
   | `0005_grants.sql` | Share codes + the stranger's session |
   | `0006_token_fix.sql` | Token generation without pgcrypto |
   | `0007_asks.sql` | Ask, confirmation, Realtime |
   | `0008_search_and_activity.sql` | Search, the activity log, and the storage fix a promoted Ask needs |
   | `0009_push.sql` | Claiming a push endpoint for the current account |
   | `0010_demo_flag.sql` | `is_demo`, and `claim_grant` returning it |

4. **Authentication → Sign In / Providers → Email** → turn **off** "Confirm
   email" (keeps the demo fast — no inbox round trip on stage).
5. Same page → enable **anonymous sign-ins**. *Required.* The stranger view
   needs a real `auth.uid()`; that's what lets Storage and Realtime treat a
   code holder like any other user instead of threading a secret through every
   request.
6. **Authentication → URL Configuration** → set **Site URL** to your deployed
   URL and add `https://<your-domain>/**` to Redirect URLs.
7. **Project Settings → API Keys** → copy the **publishable/anon** key into
   `.env.local`.

> The publishable key is *meant* to be public — it ships inside the JS bundle.
> Row-Level Security is what protects the data. **The secret / `service_role`
> key must never appear in this repo, in the frontend, or in a chat window.**

### Deploying (Vercel)

1. Import the repo. Framework preset: Vite. No config needed —
   `vercel.json` already handles SPA rewrites and service-worker headers.
2. **Settings → Environment Variables**, with **exact** names:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY`
   - `VITE_DEMO_CODE` — optional; a share code from `npm run seed:demo`. Set it
     and the landing page offers "See a real lexicon". Leave it unset and the
     page simply doesn't, which beats a button leading to an expired code.
3. Mark them **not** sensitive/secret. Vercel rejects `VITE_`-prefixed vars
   marked secret, because they're compiled into public output anyway.
4. **Deployments → ⋯ → Redeploy.** Vite bakes env vars in at *build* time, so
   adding a variable does nothing until you rebuild.

---

## Testing the security model

The RLS policies in `supabase/migrations/` **are** the security model.
Everything else is convenience on top: the stranger's entire API surface is a
handful of `security definer` functions, and if one of them leaks, a family's
private medical vocabulary leaks with it.

```bash
SEED_EMAIL=you@example.com SEED_PASSWORD=... npm run test:rls
```

It runs with **no service role key and no privileged access at all** — just the
publishable key that already ships inside the JS bundle. It is a hostile client
holding exactly what an attacker would hold, and it asserts the doors are shut:

| | What it proves |
|---|---|
| 1 | A caller with no session reads **zero rows** from every table |
| 2 | A signed-in stranger **with no grant** reads nothing, and every stranger-facing RPC refuses them |
| 3 | A grant for person A returns nothing for person B — rows or clips |
| 4 | One stranger cannot read another stranger's Ask clip, though the family can, and a grant holder cannot write outside `<person>/asks/` |
| 5 | **Revoking kills a session that was already issued** — not just future claims |
| 6 | An expired code behaves identically to a revoked one |
| 7 | A circle member can still do all of it for their own person |
| 8 | A non-member cannot create or revoke codes for someone else's person |

Case 5 is the one worth understanding. When a stranger claims a code they get a
`grant_sessions` row, and that row does not disappear when the code is revoked.
What stops them is that `has_grant_for()` re-checks the parent grant on every
single call rather than trusting the session it already handed out. A family
tapping **Revoke** expects the screen in the nurse's hand to go dead
immediately, and this is the test that says it does.

It creates two throwaway people, tries every crossing between them, and deletes
everything at the end. Safe against the project you demo from; use a scratch
project if you have one.

A failure here is a real leak, not a flaky test.

---

## Checking accessibility

Lexicon is an accessibility product. If the app itself is not accessible,
nothing else about it matters — and "we checked it by eye" is not a claim worth
making to anyone who knows this domain. So the things that can be measured are
measured, and both checks run in CI-friendly commands that fail loudly.

**Colour contrast** is computed from the design tokens themselves:

```bash
npm test          # src/styles.test.ts
```

Every foreground/background pair in `src/styles.css` is checked against WCAG AA
in **both** themes, plus a parity check that the two themes define the same
tokens and that the `prefers-color-scheme` block matches the explicit dark
theme. Those `/* 7.4:1 on --bg */` comments were typed by hand once; this is
what stops them rotting when somebody nudges a hex value.

**Layout and labelling** are checked in a real browser:

```bash
npm run build && npm run audit:ui
```

Loads all ten routes at 375px and 1280px, in light and dark — forty renders —
and fails on:

- any form control without an accessible name
- any interactive target under 44x44 CSS pixels

It stubs the backend rather than reaching one, so it needs no database and
renders the same lexicon every run. Signed URLs resolve to the real clips in
`fixtures/`, so the grid screenshots show actual moving video.

Screenshots land in `.ui-audit/` (git-ignored). They are for looking at — the
script fails on measurements, never on pixels, so it will not break because a
shadow moved.

---

## Demo data

For filming, and for anyone who wants to try Lexicon without inventing a
person and filming eight clips first.

```bash
node scripts/make-fixtures.mjs          # only if you're changing the clips
SEED_EMAIL=you@example.com SEED_PASSWORD=... npm run seed:demo
```

The seed creates a person called **Rosa (demo)** with eight signals, written to
be plausible rather than dramatic. The pair the whole thing turns on is *Pain
hum* and *Anxious hum*: a stranger cannot tell them apart, a parent never
confuses them, and their written meanings are deliberately hard to distinguish
by description alone. That is the product's argument in two tiles.

It runs through the **anon key and ordinary RLS**, signing in as a normal
account — so it doubles as a check that the policies actually permit the app's
own workflow. Never give it a service role key.

It is idempotent. It finds the demo person by name and adds only the signals
that are missing, so running it twice does not produce sixteen tiles.

At the end it prints a share code. Put it in `VITE_DEMO_CODE` (`.env.local` and
Vercel, then redeploy) and the landing page gains a **See a real lexicon**
button that opens the stranger's view with no account.

### The clips are not real people

`fixtures/` holds abstract motion studies drawn by a canvas and recorded through
Chromium — a waveform for a hum, an oscillating form for rocking. They are not
footage of anybody, staged or otherwise.

Any person seeded this way is flagged `is_demo`, and **both** the family's grid
and the stranger's view carry a banner saying so. A demo that cannot be told
apart from the real thing is not a demo, and being caught overclaiming costs
more than the demo was ever worth.

---

## Push notifications

Realtime already delivers an answer back to a stranger whose tab is open. Push
is the other direction: the parent's phone is in their pocket with the browser
closed, and nothing short of a system notification will reach them.

Push is an **accelerator, never the delivery path**. Every failure in it is
swallowed and logged — an Ask that sends without a notification is degraded, but
an Ask that fails because a notification failed is broken.

### One-time setup

1. **Generate a keypair** (skip if `VITE_VAPID_PUBLIC_KEY` is already set):

   ```bash
   npm run vapid
   ```

   The public half is printed. The private half is written to
   `.vapid-private.local`, git-ignored and deliberately never printed —
   anything printed ends up in scrollback, CI logs and screen recordings.

2. **Deploy the Edge Function.** Needs the [Supabase
   CLI](https://supabase.com/docs/guides/local-development).

   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase functions deploy notify-ask
   ```

3. **Set its secrets.** These live in Supabase, never in this repo:

   ```bash
   supabase secrets set VAPID_PRIVATE_KEY="$(cat .vapid-private.local)"
   supabase secrets set VAPID_PUBLIC_KEY="<same value as VITE_VAPID_PUBLIC_KEY>"
   supabase secrets set VAPID_SUBJECT="mailto:you@example.com"
   ```

   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.
   **Do not set them by hand, and never put the service role key anywhere near
   the frontend.**

4. **Delete the private key file** once the secret is set:

   ```bash
   rm .vapid-private.local
   ```

5. Make sure `VITE_VAPID_PUBLIC_KEY` is in Vercel's environment variables, then
   **redeploy** — Vite inlines it at build time.

### Turning it on

The family opens **Questions** for a person and taps **Get notified on this
device**, once per device. Each browser install is subscribed separately; a
parent with a phone and a laptop taps it on both.

### Verifying it end to end

The only test that counts:

1. Sign in on an Android phone, open Questions, turn notifications on.
2. **Close the browser entirely.** Not a background tab — closed.
3. On a laptop, open a share code in an incognito window and send an Ask.
4. The phone should buzz within a few seconds. Tapping the notification should
   open that person's Inbox with the question waiting.

If nothing arrives, in this order: check `/debug` for the VAPID row; check
`supabase functions logs notify-ask` for what it reported; confirm
`VAPID_PUBLIC_KEY` in Supabase secrets is byte-identical to
`VITE_VAPID_PUBLIC_KEY` in Vercel. A mismatch between those two is the classic
failure — the browser subscribes happily against a key the server cannot sign
for, and nothing anywhere reports an error.

---

## How the code is laid out

```
src/
  App.tsx                 Routing. /c/:token sits OUTSIDE the auth gate and
                          outside the family's error boundary — a nurse with a
                          code must never meet a sign-in screen, and a crash in
                          the family's screens must never take hers down. The
                          family's routes are lazy so she does not download
                          them.
  lib/
    types.ts              Domain types. Mirror the SQL schema 1:1.
    supabase.ts           Singleton client. Returns null if unconfigured.
    env.ts                Env access + isSupabaseConfigured flag.
    auth.tsx              AuthProvider (component).
    auth-context.ts       useAuth hook + context (split so fast-refresh works).
    db.ts                 EVERY database call lives here. Components never
                          touch supabase directly.
    recorder.ts           MediaRecorder wrapper, codec picking, camera opening,
                          poster-frame extraction.  ← has unit tests
    filter.ts             Layer 2 narrowing + the instant half of search.  ← tested
    push.ts               Subscribe/unsubscribe, and the base64url→bytes
                          conversion that silently breaks Web Push.  ← tested
    activity.ts           Log rows → sentences a family can read.  ← tested
    use-signal-search.ts  Instant local filter, then Postgres replaces it.
    use-document-title.ts Per-route tab titles.
    signal-fields.ts      The shape of a signal, minus the clip.
    errors.ts             Pulls a readable message out of any thrown value.
  components/
    ClipRecorder.tsx      Camera preview + record/stop/retake. Shared by the
                          family recorder and both stranger flows.
    ClipVideo.tsx         A clip that degrades to its poster, then to text.
    SignalTile.tsx        One dictionary entry in the grid.
    SignalFields.tsx      Labelling controls, shared by recording and promoting.
    AskPanel.tsx          Layer 3: compose → waiting → answered.
    ConfirmPanel.tsx      Side-by-side comparison.
    PushToggle.tsx        "Get notified", including the blocked-permission case.
    SearchBox.tsx         Secondary to Look and Point, and sized like it.
    DemoBanner.tsx        Says plainly that seeded data is not real.
    ErrorBoundary.tsx     Calm message, reload button, no stack trace on screen.
    OfflineNotice.tsx     Names a dead connection instead of hanging.
    ui/                   button, field, alert, skeleton, confirm primitives.
  routes/
    Landing.tsx           The public front door. Problem, four layers, one rule.
    SignIn.tsx            Email/password + guest.
    People.tsx            List + create a person.               (/app)
    PersonPage.tsx        The family's grid, with search and delete.
    RecordSignal.tsx      Record + label a signal.
    SharePage.tsx         Create/show/revoke share codes.
    Inbox.tsx             Answer Asks, and keep one as a signal.
    ActivityPage.tsx      Who looked, and what they concluded.
    StrangerView.tsx      /c/:token — all four layers.
    Setup.tsx             Diagnostics, at /debug. Never the landing page.
    NotFound.tsx          Assumes a mistyped or expired code, and says so.
    NotConfigured.tsx     What a visitor sees with no backend keys.

supabase/
  migrations/             Numbered SQL. Run in order. Never edit an applied one
                          — add a new numbered file instead.
  functions/notify-ask/   Deno edge function. Verifies the caller owns the Ask,
                          then sends Web Push to the circle.

scripts/
  seed-demo.mjs           A realistic demo lexicon, through the anon key.
  make-fixtures.mjs       Records the abstract demo clips in Chromium.
  make-icons.mjs          PWA icons and the link-preview image.
  test-rls.mjs            Proves the security model, holding only the anon key.
  audit-ui.mjs            40 renders; fails on unlabelled or undersized targets.
  generate-vapid.mjs      Web Push keypair. Never prints the private half.

fixtures/                 Demo clips. Abstract animations, not real people.
public/sw.js              Hand-written service worker. Push + notificationclick.
docs/ARCHITECTURE.md      Full design rationale and the original plan.
docs/SUBMISSION.md        Video script, write-up, and the pre-flight checklist.
```

### Database quick reference

**Tables:** `people`, `signals`, `circle_members`, `access_grants`,
`grant_sessions`, `ask_requests`, `push_subscriptions`, `access_log`

**Two kinds of reader, protected differently:**
- **Circle members** are signed in and authorised by a `circle_members` row.
  Ordinary RLS.
- **Strangers** have no account. They exchange a token via `claim_grant()` for
  a `grant_sessions` row bound to their anonymous `auth.uid()`. The `anon` role
  can `SELECT` nothing at all — every stranger read goes through a
  `security definer` function.

**Callable RPCs:** `create_person`, `create_grant`, `revoke_grant`,
`claim_grant`, `has_grant_for`, `signals_for_person`,
`search_signals_for_person`, `create_ask`, `answer_ask`, `mark_ask_no_match`,
`asks_for_person`, `confirm_match`, `promote_ask_to_signal`,
`access_log_for_person`, `save_push_subscription`

`ask_notification_target` exists too, and is deliberately **not** callable from
a browser — it exposes the asker's user id and only the edge function may run
it.

---

## What's left

The eight build tasks this README used to carry are done. What remains is
deployment and the submission itself.

### Apply what isn't applied yet

A project set up before this work needs the last three migrations and the edge
function. `/debug` on the deployed site names whichever piece is missing.

1. Run `0008_search_and_activity.sql`, `0009_push.sql` and `0010_demo_flag.sql`
   in the SQL Editor, in order.
2. Deploy `notify-ask` and set its secrets — [Push
   notifications](#push-notifications).
3. `npm run seed:demo`, then put the printed code in `VITE_DEMO_CODE` and
   redeploy.
4. `npm run test:rls` against the live project. It should end with every
   assertion passing.

### Then the submission

[`docs/SUBMISSION.md`](docs/SUBMISSION.md) has the video script with timings
and a shot list, the write-up ready to paste, the repo description and topics,
and a checklist. **Verify the current rules and deadline on the contest site
before you record** — that file was written without web access and does not
know this year's numbers.

---

## Don't build automatic signal matching

A camera that watches the person and decides "that's the pain hum" would:

1. **Break [the one rule](#the-one-rule)**, which is the product's strongest
   credibility claim.
2. **Not work.** Few-shot matching of idiosyncratic movement, on bodies that
   move atypically, from about five examples, is an open research problem. It
   would flicker on camera and sink the demo.
3. **Be unfalsifiable in three minutes**, which is exactly the kind of claim a
   technical judge probes first.

The honest version is already built: side-by-side comparison, judged by a
person, logged as what *they* concluded. Keep it that way, and put the
automated version in "what's next" with the reasoning attached. Refusing to
guess reads as judgement. A feature that guesses wrong about a child's pain
reads as negligence.

---

## Known gotchas — every one of these cost real debugging time

| Symptom | Cause | Fix |
|---|---|---|
| `new row violates row-level security policy for table "people"` | `INSERT ... RETURNING` applies the **SELECT** policy to the returned row. The circle membership didn't exist yet, so the row couldn't read itself back | Do both writes in one `security definer` function (`0003`) |
| `new row violates row-level security policy` on **save signal** | Storage RLS is a **separate system** from table RLS. Table policies don't cover `storage.objects` | Bucket policies in `0004` |
| `function gen_random_bytes(integer) does not exist` | pgcrypto lives in the `extensions` schema; `security definer` functions pin `search_path = public, pg_temp` and can't see it | Use `gen_random_uuid()` (Postgres core) instead of widening the search path (`0006`) |
| Deployed app shows the setup checklist forever | Vercel env vars missing, misnamed, or added without redeploying | Exact `VITE_` names, not marked secret, then **Redeploy** — Vite inlines at build time |
| `Camera access was blocked` on a laptop | `facingMode: 'environment'` asks for a rear camera a laptop lacks; and `audio: true` fails the **whole** request if only the mic is unavailable | `openCamera()` in `recorder.ts` degrades through three attempts |
| Recorded clip won't play back | `srcObject` always beats `src`. The live stream has to be detached first | See the `stage` effect in `ClipRecorder.tsx` |
| Grid tiles don't animate on mobile | Autoplay requires `muted`; without `playsInline` iOS takes every tile fullscreen | All three attributes on every grid `<video>` |
| Confirmation email link goes to `localhost:3000` | Supabase **Site URL** still on its default | Auth → URL Configuration |
| Stranger view says the code is invalid | Anonymous sign-ins disabled | Auth → Providers → enable it |
| Vercel rejects an env var as secret | `VITE_`-prefixed vars are compiled into public output | Mark it not sensitive |
| A promoted Ask shows a blank tile to strangers | Its clip stays under `<person>/asks/`, which `0007` hides from grant holders | `0008` lets them read one **once a signals row points at it** — publishing is the family's explicit act |
| "Get notified" appears to work and never delivers | Two accounts on one phone collide on `push_subscriptions.endpoint`, and neither policy lets the second touch the first's row | `save_push_subscription` (`0009`) — an endpoint is a browser, not an account, so it changes hands |
| Push subscribes fine, nothing ever arrives | `VAPID_PUBLIC_KEY` in Supabase differs from `VITE_VAPID_PUBLIC_KEY` in Vercel, or the base64url→bytes conversion is wrong | Make them byte-identical; the conversion is unit-tested in `push.test.ts` |
| A new image or icon 404s, or serves the HTML shell | The Vercel rewrite used to name each static file to exclude | It now matches on file extension — nothing to maintain |
| Clips have no visible edge in dark mode | A clip's own dark background sits ~1.05:1 from the tile surface | `SignalTile` gives the video its own border |

---

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Typecheck + production build |
| `npm test` | Unit tests — 81, including WCAG contrast on every token pair |
| `npm run lint` | Lint (must be clean — **no warnings**) |
| `npm run audit:ui` | 40 browser renders; fails on unlabelled or sub-44px targets, or on a route that did not render. Builds its own bundle |
| `npm run test:rls` | Proves the security model against a real project, anon key only |
| `npm run seed:demo` | Fill a database with the demo lexicon, and print a share code |
| `npm run vapid` | Generate a Web Push keypair |
| `npm run fixtures` | Re-record the demo clips (only if changing the artwork) |
| `npm run icons` | Re-render the PWA icons and link-preview image |

## Conventions

- **Every** database call goes in `src/lib/db.ts`. Components never import
  `supabase` directly. (`push.ts` is the one exception, and only because a
  subscription is a browser fact rather than a row.)
- New SQL goes in a **new numbered migration**. Never edit an applied one.
- Comments explain **why**, not what. Match the existing style.
- `npm test && npm run lint && npm run build` all clean before every commit.
- Work on a branch, merge to `main` when it's green. Vercel deploys `main`.

## Stack

React 19 · Vite · TypeScript · Tailwind v4 · Supabase (Postgres, Storage,
Realtime, Auth, Deno edge functions) · Web Push · Vercel

Full design rationale, the phase plan, and the reasoning behind every product
decision: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
