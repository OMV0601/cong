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

## Current state — read this before writing code

### ✅ Working end to end

**Family side**
- Email/password sign in, sign up, and "Continue as guest" (anonymous auth)
- Add a person (`create_person` RPC — creates person + circle membership atomically)
- Record a clip in-browser, label it: name, meaning, body region, is-sound,
  urgency, optional FLACC category
- Grid of looping clips with per-clip audio toggle (one at a time)
- Create share codes with a label + lifetime, show QR, copy link, revoke
- Inbox showing pending questions with a live count badge on the person page

**Stranger side** (`/c/:token`, no account, no install)
- Layer 1 grid, Layer 2 filters (only filters that would return something)
- Layer 3 Ask: film → send → answer arrives over Realtime with no refresh
- Layer 4: family can reply "I don't recognise it"
- Side-by-side confirmation: film what you see, both clips play next to each
  other, you decide — logged to `access_log`

### ⚠️ Backend exists, NO user interface

These SQL functions are written, tested by hand, and callable — but nothing in
the UI calls them. **This is the cheapest remaining work.**

| Function | In `db.ts` | What's missing |
|---|---|---|
| `promote_ask_to_signal` | `promoteAskToSignal()` | No button in the Inbox |
| — | `deleteSignal()` | No delete button on a tile |
| `access_log` table | — | Family can't see who looked |
| `signals.search` (tsvector) | — | No search box |

### ❌ Not built at all

- **Web Push.** Answers reach a *waiting* stranger over Realtime, which needs
  the tab open. The family's phone does NOT buzz with the app closed. The
  service worker (`public/sw.js`) and VAPID generator are ready; the Edge
  Function and subscription UI are not. **This is Task 1 and it's the demo's
  money shot.**
- Visual design pass (it's functional, not designed)
- Demo clips, submission video, Devpost write-up

---

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
2. **Settings → Environment Variables**, add all three with **exact** names:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_VAPID_PUBLIC_KEY`
3. Mark them **not** sensitive/secret. Vercel rejects `VITE_`-prefixed vars
   marked secret, because they're compiled into public output anyway.
4. **Deployments → ⋯ → Redeploy.** Vite bakes env vars in at *build* time, so
   adding a variable does nothing until you rebuild.

---

## How the code is laid out

```
src/
  App.tsx                 Routing. /c/:token sits OUTSIDE the auth gate —
                          a nurse with a code must never meet a sign-in screen.
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
    filter.ts             Layer 2 narrowing logic.  ← has unit tests
    errors.ts             Pulls a readable message out of any thrown value.
  components/
    ClipRecorder.tsx      Camera preview + record/stop/retake. Shared by the
                          family recorder and both stranger flows.
    SignalTile.tsx        One dictionary entry in the grid.
    AskPanel.tsx          Layer 3: compose → waiting → answered.
    ConfirmPanel.tsx      Side-by-side comparison.
    ui/                   button, field, alert primitives.
  routes/
    SignIn.tsx            Email/password + guest.
    People.tsx            List + create a person.
    PersonPage.tsx        The family's grid.
    RecordSignal.tsx      Record + label a signal.
    SharePage.tsx         Create/show/revoke share codes.
    Inbox.tsx             Answer pending Asks.
    StrangerView.tsx      /c/:token — all four layers.
    Setup.tsx             Phase 0 status board (delete before submitting).

supabase/migrations/      Numbered SQL. Run in order. Never edit an applied one
                          — add a new numbered file instead.
public/sw.js              Hand-written service worker. Push handler is ready
                          and currently receives nothing.
docs/ARCHITECTURE.md      Full design rationale and the original plan.
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
`claim_grant`, `has_grant_for`, `signals_for_person`, `create_ask`,
`answer_ask`, `mark_ask_no_match`, `asks_for_person`, `confirm_match`,
`promote_ask_to_signal`

---

## What's left — copy-paste prompts

Each task below is self-contained. Open Claude Code in the repo root and paste
the prompt verbatim. They're ordered by importance. **Tasks 1–3 are what the
submission actually needs; 4–8 are polish.**

Before starting anything:

```bash
git checkout main && git pull
npm install
npm test && npm run lint && npm run build   # all three must pass clean
```

---

### Task 1 — Web Push (the demo's money shot) 🔴 DO THIS FIRST

Right now the answer only reaches a stranger whose tab is still open. The
moment in the video where **the parent's phone buzzes in their pocket** doesn't
exist yet. This is the single highest-value thing left.

<details>
<summary><strong>Copy this prompt</strong></summary>

```
Read docs/ARCHITECTURE.md and public/sw.js first, then implement Web Push.

CONTEXT
- public/sw.js already has a working `push` and `notificationclick` handler.
  Do not rewrite it unless it's actually wrong.
- The push_subscriptions table already exists (0001_schema.sql) with RLS
  (0002_rls.sql): user_id, endpoint, p256dh, auth, user_agent.
- `npm run vapid` generates a keypair. The public half goes in
  VITE_VAPID_PUBLIC_KEY; the private half is written to .vapid-private.local
  and must never be committed or printed.
- The target device is Android Chrome. Do not assume iOS.

BUILD THESE

1. src/lib/push.ts
   - isPushSupported(): checks serviceWorker + PushManager + Notification
   - subscribeToPush(): registers /sw.js, calls Notification.requestPermission(),
     subscribes with the VAPID public key (convert base64url → Uint8Array —
     this conversion is a classic source of silent failures, write a unit test
     for it), then upserts the subscription into push_subscriptions.
   - unsubscribeFromPush(): unsubscribes and deletes the row.
   - getPushState(): 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'
   Export a `urlBase64ToUint8Array` helper and unit-test it in
   src/lib/push.test.ts against a known VAPID key.

2. A Supabase Edge Function at supabase/functions/notify-ask/index.ts (Deno).
   - Invoked by the client right after create_ask succeeds. Do NOT use a
     database webhook — it's more setup for the person deploying this.
   - It receives { askId } and the caller's JWT automatically.
   - It must VERIFY the caller actually owns that ask (ask_requests.asker_user_id
     = the JWT's sub). Never trust the body alone.
   - Then, using the service role key from its own env (Deno.env.get(
     'SUPABASE_SERVICE_ROLE_KEY') — it's injected, do not ask the user for it):
     find circle_members for that person where can_answer = true, load their
     push_subscriptions, and send a Web Push to each.
   - Payload: { title, body, askId, url: '/person/<id>/inbox' }
   - Use https://esm.sh/web-push for signing, or implement VAPID JWT signing
     with the Deno standard library if that import is unreliable.
   - Delete subscriptions that return 404 or 410 — those endpoints are dead.
   - Return 200 even if some sends fail; a failed notification must never fail
     the Ask itself. Log failures.

3. Wire it up
   - In src/lib/db.ts, after createAsk() succeeds, call
     supabase.functions.invoke('notify-ask', { body: { askId } }).
     Wrap in try/catch — if push fails, the Ask must still work, because
     Realtime is the primary path and push is the accelerator.
   - Add a "Get notified" toggle on src/routes/Inbox.tsx showing the current
     push state, with a clear explanation of what it does. Handle 'denied'
     with instructions to fix it in browser settings.

CONSTRAINTS
- Never print, log, or commit the VAPID private key.
- Run `npm test && npm run lint && npm run build` before committing.
- Add a section to README.md under "Push notifications" with the exact
  deployment steps for the Edge Function, including how to set
  VAPID_PRIVATE_KEY and VAPID_SUBJECT in Supabase secrets.
- Commit with a message explaining WHY push exists alongside Realtime.
```

</details>

**How to verify:** Family account on an Android phone, subscribed. Close the
browser entirely. Send an Ask from a laptop in incognito. The phone should
buzz. Tapping the notification should open the Inbox with that Ask visible.

---

### Task 2 — Wire up the four orphaned backend functions 🔴 CHEAP AND HIGH VALUE

Four things already work in the database and have no button. This is a few
hours for a visible jump in completeness.

<details>
<summary><strong>Copy this prompt</strong></summary>

```
Four database capabilities exist with no user interface. Wire each one up.
Read src/lib/db.ts and supabase/migrations/0007_asks.sql first.

1. PROMOTE AN ANSWER INTO A SIGNAL  (db.ts: promoteAskToSignal, already written)
   This is the feature that makes Lexicon better than a phone call: a question
   asked once never needs asking again.
   - In src/routes/Inbox.tsx, on an ANSWERED ask, add "Save this as a signal".
   - Opens a small form: label (required), meaning, body region, is-sound,
     urgency — same fields as RecordSignal.tsx, reuse the same controls.
   - On success show it worked and refresh the list.
   - The Ask's existing clip becomes the signal's video. No re-recording.

2. DELETE A SIGNAL  (db.ts: deleteSignal, already written)
   - Add a delete affordance to src/components/SignalTile.tsx, shown only when
     an `onDelete` prop is passed, so the stranger view never gets one.
   - Confirm before deleting. Deleting a signal is not recoverable and it
     removes the clip from Storage too.
   - Wire it into PersonPage.tsx only.

3. THE ACCESS LOG  (table exists, nothing reads it)
   The family should be able to see exactly who looked and when. This is a
   trust feature and it demos well — say "the family sees every view" on camera.
   - New route /person/:id/activity and a link from PersonPage.
   - Read access_log joined to access_grants for the grant label.
   - Actions in the table today: 'opened', 'asked', 'confirmed_match',
     'rejected_match'. Render each in plain English, e.g.
     "Overlake ER opened the lexicon" / "confirmed Pain hum".
   - Newest first, grouped by day. Empty state if nothing yet.
   - Add a db.ts function for this; components never call supabase directly.

4. SEARCH  (signals.search tsvector + GIN index exist, unused)
   - Add a search box to PersonPage.tsx and StrangerView.tsx.
   - Postgres full-text search via .textSearch() on the existing column.
   - For the stranger view it must go through a security definer function
     (they cannot SELECT signals directly) — add one in a new migration,
     following the pattern of signals_for_person in 0005_grants.sql.
   - Secondary to Look and Point. Small, below the filters, not the hero.

RULES
- New SQL goes in a NEW numbered migration (0008_...). Never edit an applied one.
- Every database call goes in src/lib/db.ts.
- Match the existing code's comment style: explain WHY, not WHAT.
- npm test && npm run lint && npm run build must pass.
```

</details>

---

### Task 3 — Visual design pass 🟡 NEEDED BEFORE FILMING

The app is functional and undesigned. The subject matter is accessibility, so
**if the app itself isn't accessible that's fatal** — a judge will check.

<details>
<summary><strong>Copy this prompt</strong></summary>

```
Do a visual design pass on Lexicon. Read src/styles.css first — the design
tokens, WCAG-verified colour pairings, 44px touch targets and reduced-motion
support are already there. Build on them, don't replace them.

PRINCIPLES (from docs/ARCHITECTURE.md §9)
- The video grid IS the product. The interface should disappear.
- Calm and clinical, not techy. This sits next to a hospital bed. It should
  feel like a well-made medical tool, not a startup landing page.
- NO gradients, NO glassmorphism, NO floating cards, NO decorative animation.
- Red is reserved exclusively for urgency. Never for emphasis or decoration.
- One accent colour. One type family, two weights. One icon set (lucide).

WORK
1. Typography scale — currently ad-hoc Tailwind classes. Define a real scale
   and apply it consistently across every route.
2. Spacing rhythm — pick a scale and apply it. Inconsistent gaps are the most
   visible "unfinished" signal.
3. Empty states — every list has one; make them genuinely helpful, not cute.
4. Loading states — replace bare "Loading…" text with skeletons that match the
   shape of what's coming.
5. The stranger view is the screen a judge will stare at. It should look
   calm and obvious under stress. Spend the most time here.
6. Mobile first. Test at 375px wide. The stranger uses this one-handed.

ACCESSIBILITY — non-negotiable, verify don't eyeball
- Every colour pair at WCAG AA. Check with a contrast calculator, not by eye.
- Every interactive target ≥44px.
- Visible focus ring on everything focusable.
- Every input associated with a label (the Field component in
  src/components/ui/field.tsx already enforces this — use it everywhere).
- Works in both light and dark mode. Test both.

Then write a Playwright script that loads each route at 375px and 1280px,
screenshots it, and asserts zero unlabelled inputs and zero targets under 44px.
Fix anything it finds.

npm test && npm run lint && npm run build must pass.
```

</details>

---

### Task 4 — Demo data and seeding 🟡

<details>
<summary><strong>Copy this prompt</strong></summary>

```
Create a seeding path so a fresh database can be filled with a realistic demo
lexicon in under a minute, for filming and for judges who want to try it.

1. scripts/seed-demo.mjs
   - Takes SUPABASE_URL and a user's email/password from env (never hardcode).
   - Creates a demo person and ~8 signals with plausible labels and meanings
     drawn from the ER scenario in docs/ARCHITECTURE.md (pain hum, anxious hum,
     hand flick, rocking, etc.).
   - Uses short placeholder video files from a new fixtures/ directory.
   - Idempotent: running it twice must not create duplicates.

2. A clear banner in the UI when viewing seeded demo data, so a judge is never
   confused about what's real. Add an `is_demo` boolean to people in a new
   migration (0009_...).

3. Document it in README under a "Demo data" heading.

npm test && npm run lint && npm run build must pass.
```

</details>

---

### Task 5 — Delete the Phase 0 status board 🟢

`src/routes/Setup.tsx` was scaffolding for verifying the plumbing. It's still
routed at `/setup` and still renders when Supabase is unconfigured.

<details>
<summary><strong>Copy this prompt</strong></summary>

```
src/routes/Setup.tsx was Phase 0 scaffolding for checking that the backend was
reachable. Decide whether it still earns its place:

- If keeping it: move it to /debug, make sure it is never the landing page for
  a real user, and say in the README that it exists for troubleshooting.
- If removing it: delete the file and its routes, and make App.tsx show a
  simple honest message when isSupabaseConfigured is false.

Either way, a first-time visitor to the deployed site must land on sign-in,
never on a developer checklist. Explain your choice in the commit message.
```

</details>

---

### Task 6 — Error boundaries and offline handling 🟢

<details>
<summary><strong>Copy this prompt</strong></summary>

```
Lexicon gets used in hospitals, where wifi is unreliable. Make failure graceful.

1. A React error boundary around the routes. On a crash: a calm message, a
   reload button, and NO stack trace shown to the user. This matters most on
   /c/:token — a nurse must never see a white screen.
2. Detect offline (navigator.onLine + fetch failures) and say so plainly,
   rather than letting requests hang.
3. Retry-with-backoff for signed URL fetching in db.ts signPaths() — a
   transient failure currently means a grid of blank tiles.
4. Video elements need an onError fallback showing the poster frame plus the
   label, so a failed clip still communicates its meaning in text.

npm test && npm run lint && npm run build must pass.
```

</details>

---

### Task 7 — Test coverage for the security model 🟢

Currently 19 unit tests, all on pure logic. The RLS policies — the most
security-critical part — are only verified by hand.

<details>
<summary><strong>Copy this prompt</strong></summary>

```
The RLS policies in supabase/migrations/ are the security model and nothing
tests them automatically. Write tests that prove they hold.

Create scripts/test-rls.mjs that runs against a real Supabase project using
only the ANON key, and asserts:

1. An anonymous caller with no grant can SELECT nothing from signals, people,
   ask_requests, or access_log — zero rows, every time.
2. A REVOKED grant token returns zero access: claim_grant must fail, and any
   previously-issued grant_session must stop working (has_grant_for re-checks
   the parent grant, so verify that specifically).
3. An EXPIRED grant behaves the same.
4. A grant holder for person A cannot read person B's signals.
5. A grant holder cannot read another stranger's Ask clips in Storage
   (the `<person_id>/asks/` folder).
6. A circle member CAN do all of the above for their own person.

Document how to run it in README. This is worth doing carefully — "we tested
our security model" is a strong thing to be able to say, and a judge may ask.
```

</details>

---

### Task 8 — The submission 🔴 DO NOT LEAVE TO THE LAST DAY

<details>
<summary><strong>Copy this prompt</strong></summary>

```
Help me prepare the Congressional App Challenge submission.

THE VIDEO (1–3 minutes, hard limit, judges may penalise going over)
Required by the rules: names of participants, app name, one-sentence purpose,
target audience, tools and languages used, and how the app works.

Structure it as:
1. Open on the scene, not the market size. A non-speaking teenager in an ER at
   11pm. The nurse thinks the rocking is anxiety. It's pain.
2. Show the grid. Show the filter. Show a match found in about four seconds.
3. Show the Ask: film, send, and the answer arriving on the other device.
   Two phones in one shot. This is the climax — do not rush it.
4. One line that quietly kills the obvious objection, as the Ask sends:
   "She doesn't have to describe it. She just shows her."
5. Show side-by-side confirmation, and say the rule out loud:
   "Lexicon never decides what a signal means. A person always confirms."
6. Tech stack, ~30 seconds. There's a script in docs/ARCHITECTURE.md §9.

HONESTY — this is not optional
- If the clips are of us rather than real families, SAY SO on screen.
- Do not claim any feature that isn't built. Volunteering what's synthetic
  converts a weak point into an integrity signal; being caught overclaiming
  does the opposite, and a judge who knows this domain will notice.

ALSO WRITE
- A repo description and topics for GitHub.
- The submission write-up. Replace any default template headings with our own.
- A "What's next" section that names automatic signal matching as a deliberate
  future step, WITH the reason it isn't in v1: a wrong pain reading is worse
  than no reading. That reads as judgement, not as a missing feature.

Check the current rules at congressionalappchallenge.us before finalising —
do not rely on what this README says about the deadline.
```

</details>

---

### Task 9 — Don't do this

**Do not build automatic signal matching.** A camera that watches the person
and decides "that's the pain hum" would:

1. **Break the one rule**, which is the product's strongest credibility claim.
2. **Not work.** Few-shot matching of idiosyncratic movement, on bodies that
   move atypically, from ~5 examples, is an open research problem. It would
   flicker on camera and sink the demo.
3. **Be unfalsifiable in three minutes**, which is exactly the kind of claim a
   technical judge probes first.

The honest version is already built: side-by-side comparison, judged by a
person, logged as what *they* concluded. Keep it that way, and put the
automated version in "What's next" with the reasoning attached.

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

---

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Dev server on :5173 |
| `npm run build` | Typecheck + production build |
| `npm test` | Unit tests (19 currently, all passing) |
| `npm run lint` | Lint (must be clean — no warnings) |
| `npm run vapid` | Generate a Web Push keypair |

## Conventions

- **Every** database call goes in `src/lib/db.ts`. Components never import
  `supabase` directly.
- New SQL goes in a **new numbered migration**. Never edit an applied one.
- Comments explain **why**, not what. Match the existing style.
- `npm test && npm run lint && npm run build` all clean before every commit.
- Work on a branch, merge to `main` when it's green. Vercel deploys `main`.

## Stack

React 19 · Vite · TypeScript · Tailwind v4 · Supabase (Postgres, Storage,
Realtime, Auth) · Vercel

Full design rationale, the phase plan, and the reasoning behind every product
decision: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
