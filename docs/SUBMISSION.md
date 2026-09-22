# Submission

Everything needed to submit Lexicon, in the order you'll need it.

**Verified against the 2026 rules on 22 Sept 2026:**

| | |
|---|---|
| **Deadline** | **26 October 2026, 12:00 PM ET** |
| **Video length** | **1–3 minutes.** Submissions outside that may be penalised at the judges' discretion |
| **Eligibility** | Middle or high school student at time of submission, US resident |
| **Teams** | Up to 4. At least half must be eligible in the district you enter |
| **AI usage** | Permitted **but must be fully disclosed** — see §0 below, this one is easy to get wrong |

Re-check [the rules page](https://www.congressionalappchallenge.us/students/rules/)
close to the date anyway. Anywhere you see `[SQUARE BRACKETS]`, fill it in.

---

## 0. AI disclosure — read this first

The 2026 rules say, verbatim:

> "The use of AI tools in app development for the Congressional App Challenge
> is permitted, provided that **all AI usage is fully disclosed in the
> submission materials**. AI may only be used to support specific aspects of
> the project and **must not constitute the entirety of the technical
> development**. Participants are expected to demonstrate **significant
> individual contributions and technical understanding** of their app."

Lexicon was built with heavy use of Claude Code. That is allowed. Three things
follow from it, and none are optional:

**1. Disclose it, specifically.** Not "we used AI for some parts." Name the
tool, and say honestly which parts it wrote and which parts you did. A vague
disclosure reads worse than a precise one. Put it in the write-up and say a
version of it in the video.

**2. Be able to explain the app.** "Technical understanding" is an explicit
requirement and a judge may test it. Before you submit, make sure you can
answer, without notes:

- Why does the stranger get signed in anonymously instead of just using the
  token directly? *(Storage and Realtime policies can't read a token out of a
  URL — they need a real `auth.uid()` to check a row against.)*
- What stops someone with a share link from reading another person's signals?
  *(RLS: the `anon` role can `SELECT` nothing; every stranger read goes through
  a `security definer` function that checks `grant_sessions`.)*
- Why is there no automatic matching? *(See §3 and the README. This is a
  design decision you made, and it's the strongest answer you have.)*
- Walk through what happens between "Send" and the answer appearing.

If any of those is shaky, read the code until it isn't. `npm run test:rls`
demonstrates the second one running live, which is a good thing to be able to
show.

**3. Your own contributions are real — say what they were.** The product
decisions were not the AI's: choosing this problem over four others, the
four-layer structure, rejecting automatic matching, the side-by-side
confirmation, moving the forcing function to the school handoff. Write those
down as yours, because they are, and they are the part that actually matters.

> Be accurate here rather than modest or generous. An honest, specific
> disclosure is a credibility signal. An inaccurate one — in either direction —
> is the kind of thing that unravels under a single question.

---

## 1. Before you record

Get these done first. Filming around a half-built demo is how a two-minute
video takes six hours.

- [ ] Run the three migrations that aren't applied yet (`0008`, `0009`, `0010`)
- [ ] Deploy the Edge Function and set its secrets — see README → Push notifications
- [ ] `npm run seed:demo`, then put the printed code in `VITE_DEMO_CODE` and redeploy
- [ ] `npm run test:rls` passes against the live project
- [ ] Open `/debug` on the deployed site — every row green
- [ ] Do a full dry run on two real devices, including the phone buzzing with the browser **closed**
- [ ] Charge both devices. Turn off every other notification on the phone.

**Record the clips you'll demo with as real clips.** The seeded fixtures are
abstract animations; they are fine for a judge poking at the live site, but on
camera they look like what they are. Film a handful of real signals — see the
honesty section below for what you have to say about them.

---

## 2. The video

**Target 2:30. Hard ceiling 3:00** — confirmed. Going over is an easy way to lose
points for no reason.

### What the rules require you to say

Work these in naturally rather than reading a list:

| Required | Where it lands below |
|---|---|
| Participant name(s) | 0:00 and 2:20 |
| App name | 0:18 |
| One-sentence purpose | 0:18 |
| Target audience | 0:30 |
| Tools and languages | 2:00 |
| How the app works | 0:40 – 2:00 |

### Script

**0:00 — 0:18 · The scene, not the market size**

> *[Shot: a phone on a bedside table in a dim room. No app yet.]*
>
> "I'm `[YOUR NAME]`, and I want to tell you about eleven o'clock at night in
> an emergency room.
>
> A teenager who can't speak is rocking back and forth. The nurse has never met
> her. She writes down 'anxious'.
>
> She's wrong. The rocking means her stomach hurts. Her mother would have known
> in a second — but her mother isn't in the room."

**0:18 — 0:30 · Name it**

> *[Shot: the landing page, then cut to the grid of clips.]*
>
> "This is Lexicon. It lets a family record what someone's real signals mean,
> so a stranger can look one up in the moment."

**0:30 — 0:40 · Who it's for**

> "It's for non-speaking people — and for everyone who meets them without
> speaking their language. ER nurses, substitute aides, respite workers, new
> staff on a group-home shift.
>
> If mom is standing right there, you ask mom. This is for the hours she isn't,
> which is most school days, most night shifts, and most of adult life."

**0:40 — 1:05 · Layer 1 and 2 · Look, then Point**

> *[Shot: scan the QR code with a second device. Screen recording of the
> stranger's view loading. Let the grid breathe — it's the product.]*
>
> "The nurse scans a code. No account, no install.
>
> Every clip loops. She just looks." *(beat — let it play)*
>
> *[Tap "Legs or feet". Grid narrows.]*
>
> "If nothing jumps out, she taps where it's happening. She doesn't need
> vocabulary for this — that's the whole point. She has no words for what she's
> seeing. She can always point."
>
> *[Land on the right clip. Show the meaning text.]*
>
> "Four seconds."

**1:05 — 1:25 · The one rule**

> *[Shot: side-by-side confirmation. Her clip next to the family's.]*
>
> "She films what she's actually seeing, and the two play next to each other.
>
> Lexicon never decides what a signal means. A person always confirms it. A
> wrong automatic pain reading is more dangerous than no reading at all."

**1:25 — 1:55 · Layer 3 · Ask ★ the climax, don't rush it**

> *[Shot: BOTH DEVICES IN FRAME. This is the shot the whole video is for.]*
>
> "And when nothing matches — she films five seconds and sends it."
>
> *[Phone buzzes on the table, screen lit, browser closed.]*
>
> "She doesn't have to describe it. She just shows her."
>
> *[Mother taps the notification, watches, types one line, sends. Cut to the
> nurse's screen — the answer appears with nobody touching it.]*
>
> "And it gets kept. The family saves it as a new signal, so the next person on
> the next shift never has to ask again.
>
> A phone call can't do that. A phone call evaporates."

**1:55 — 2:20 · How it's built**

> *[Shot: the activity log, then briefly the code or the schema.]*
>
> "It's a React and TypeScript web app on Vite, with Supabase for Postgres,
> storage, auth and realtime, deployed on Vercel. Clips are recorded in the
> browser with MediaRecorder.
>
> A stranger holds a short-lived code, not an account — and the database gives
> them no direct read access at all. Every read goes through a function that
> checks the code first, and revoking it kills their session instantly. There's
> an automated test suite that proves it, running with nothing but the public
> key.
>
> The family sees every single view."

**2:20 — 2:35 · Close**

> *[Shot: back to the grid, quiet.]*
>
> "Every non-speaking person already has a vocabulary. It just lives in one
> person's head.
>
> Lexicon gets it out. I'm `[YOUR NAME]`. Thanks for watching."

### Shot list

| # | Shot | Notes |
|---|---|---|
| 1 | Dim room, phone on table | Sets the scene. No UI. |
| 2 | Landing page → grid | Screen recording, not a camera pointed at a screen |
| 3 | QR scan, device to device | Real scan, one take |
| 4 | Stranger's grid, then a filter tap | Let the clips loop for 2s before touching anything |
| 5 | Side-by-side confirmation | Both clips visible |
| 6 | **Two devices in one frame** | Rehearse. This shot carries the video. |
| 7 | Notification arriving | Screen must be visibly locked/closed beforehand |
| 8 | Answer landing, untouched | Hands visibly off the device |
| 9 | Activity log | Quick |

### Recording notes

- Screen-record the app (built-in recorder on both platforms). Only use a
  camera for the two-device shot.
- Mute notification sounds; the buzz should be the only thing that happens.
- Shoot the two-device shot at least five times. Something always goes wrong.
- Put the devices on the same wifi as the router if you can — a dropped push
  mid-take costs a reshoot.
- Read the script out loud before you record. Anything you stumble on is a
  sentence that needs shortening.

---

## 3. Honesty — not optional

Being caught overclaiming costs far more than any feature is worth, and a judge
who knows this domain will notice. Volunteering a weakness converts it into an
integrity signal.

**Must appear on screen or be said out loud:**

- **If the clips are of you and your friends rather than real non-speaking
  people, say so.** A caption is enough: *"Clips filmed by us as stand-ins. No
  real patient footage was used."*
- **Don't claim a feature you didn't build.** Everything in the script above is
  built and working. Don't add to it on the day.
- The seeded demo lexicon already labels itself as sample data in the app. Leave
  that banner visible if you show it.

**Say the limit out loud** (it's in the script at 0:30): if the parent is right
there, you ask the parent. Naming the boundary of your own product is the
single cheapest credibility you can buy.

---

## 4. The write-up

Replace any default template headings with these.

### What it does

Lexicon is a shared vocabulary for people who don't speak with words.

Some people communicate through sounds, movements and expressions rather than
speech. Their family reads it fluently after years of practice. A stranger reads
none of it — so the moment they're with someone new, an ER nurse, a substitute
aide, a respite worker, they effectively lose their voice.

A family records short labelled clips of the person's real signals while they're
at home and calm. A stranger scans a code and gets a grid of those clips, with
no account and no install. They look. If nothing matches, they tap where it's
happening rather than trying to describe it. If it still doesn't match, they
film five seconds and send it, and the family's phone buzzes with the browser
closed. The answer lands back on the stranger's screen without them touching it
— and the family can keep it as a new entry, so nobody has to ask again.

### The problem

The standard answer to this is "call the parent." That answer fails for five
specific reasons:

1. **A call makes you describe something you have no words for.** *"He's doing…
   something with his hand?"* is not something a parent can work with. Video
   skips the describing step entirely.
2. **You have to know you're confused to make the call.** The nurse in our
   example isn't confused. She's confidently wrong — she's sure it's anxiety.
   A grid of labelled clips is what tells her there was something to look up.
3. **Calling costs minutes; an Ask costs seconds.** Find the number, dial,
   explain who you are and where, hold. People skip that on a maybe.
4. **The parent often isn't reachable, or isn't there at all.** Driving, asleep,
   in surgery after the same crash. For adults in group homes, parents may be
   elderly or gone.
5. **Nothing is retained.** The shift changes and the next person starts from
   zero. Every call re-teaches the same lesson to a different stranger.

Lexicon doesn't replace the call. It *is* the call — made cheap, and kept.

### The rule we built everything around

**Lexicon never interprets. It only retrieves.**

No model decides what a signal means. The app surfaces candidates and a human
confirms them, side by side, against the person in front of them. What gets
recorded is what a *person* concluded.

We could have built a camera that watches someone and announces "that's the pain
hum." We deliberately didn't, for three reasons: a wrong automatic pain reading
is more dangerous than no reading; few-shot recognition of idiosyncratic
movement from five examples, on bodies that move atypically, is an open research
problem; and a claim like that is unfalsifiable in a three-minute video, which
is exactly the kind of thing that should make you suspicious of it.

Refusing to guess is what makes everything else here trustworthy.

### How we built it

React 19, TypeScript and Vite on the front end, Tailwind for styling, deployed
on Vercel. Supabase provides Postgres, file storage, authentication and realtime
subscriptions. Clips are recorded in the browser with the MediaRecorder API.
Notifications are Web Push through a Deno edge function.

About 9,800 lines all in: 5,600 of application code, 1,700 of SQL across 10
migrations, 1,700 of tooling — a seeding script, an accessibility audit and a
security test suite — and 81 unit tests.

The interesting problem was access control. A stranger has no account and never
will, so there are two kinds of reader protected two different ways. Family
members are ordinary authenticated users governed by row-level security. A
stranger holds a short-lived code, is signed in anonymously to get a real user
id, and exchanges the code for a session row — and the `anon` role can read
nothing at all. Every read a stranger performs goes through a `security definer`
function that validates the grant first. Revoking a code kills sessions already
issued from it, because the check re-runs against the parent grant on every
call rather than trusting the session it handed out.

That's the part we'd most want someone to check, so `npm run test:rls` proves
it: 40-odd assertions run against the real database holding nothing but the
public key that ships inside the JavaScript bundle.

**AI disclosure.** We built Lexicon with heavy use of Claude Code, an AI coding
assistant. It wrote most of the implementation — the React components, the SQL
migrations and policies, the edge function and the test suites — working from
our direction.

What was ours: choosing this problem, and the shape of the answer. That a
stranger who cannot describe what they are seeing needs to *point* rather than
type. That the app must never decide what a signal means, even though that
would have been the flashier build. That the honest version of validation is
two clips side by side judged by a person. That an answered question should
become a permanent entry, because that is the thing a phone call cannot do.
We rejected an automatic-matching feature on purpose, and the reasoning is
written down in the repository.

`[FILL IN: anything either of you wrote or debugged directly, and the parts
you had to push back on.]`

We understand the system we shipped and can walk through any part of it.

### What we learned

Storage policies and table policies are separate systems in Postgres — securing
the tables did nothing for the files, and the clips failed to upload with an
error that pointed at the wrong place entirely. `INSERT ... RETURNING` applies
the *select* policy to the row it returns, so creating a person failed its own
permission check until both writes moved into one transactional function.

The one that took longest: the base64url-to-bytes conversion for a VAPID key
fails silently. Get it wrong and the browser subscribes happily against a key
the server can't sign for, and notifications simply never arrive with nothing
anywhere reporting an error. It's unit-tested now.

Less technically: almost every feature here exists because we tried to answer
an objection honestly rather than argue with it. "Just call the parent" is what
produced the save-an-answer-as-a-signal feature, which is the thing a phone call
can't do.

### What's next

**Automatic signal matching — deliberately not in v1.** A camera that watches
the person and proposes a match is the obvious next step and we're not going to
ship it until it can be wrong safely. A wrong pain reading handed to a clinician
is worse than no reading. If it ever ships, it will surface a ranked shortlist
for a human to confirm, never an answer, and it will never touch the urgent
signals.

Nearer term: multiple caregivers per person with roles, offline caching of a
lexicon before a hospital visit, and a printable one-page version for the
literal bedside.

---

## 5. GitHub

**Description** (350 char limit):

> Every non-speaking person has a vocabulary — it just lives in one person's
> head. Lexicon lets a family record what someone's real signals mean, so a
> nurse who has never met them can look one up in seconds, or reach the family
> live. It never interprets; a human always confirms.

**Topics:**

```
accessibility  assistive-technology  aac  non-speaking  healthcare
congressional-app-challenge  react  typescript  supabase  postgresql
web-push  pwa  row-level-security  vite
```

**Before you make it public:**

- [ ] `.env.local` is git-ignored and was never committed — `git log --all --full-history -- .env.local` should be empty
- [ ] `.vapid-private.local` likewise, and delete the local file once the secret is set
- [ ] No `service_role` key anywhere: `git grep -in "service_role"` — the only
      hits should be the warning in `.env.example`, the guard in
      `scripts/test-rls.mjs`, the grant in `0009_push.sql`, and the edge
      function reading it from its own environment. Any hit with an actual key
      after it means rotating that key immediately.
- [ ] Pin the repo on your profile

---

## 6. Final checklist

- [ ] Rules, required elements and deadline verified on the contest site **today**
- [ ] Video under the limit, with every required element spoken
- [ ] Stand-in clips disclosed on screen if they're not real
- [ ] **AI usage disclosed specifically in the write-up** — required by the 2026 rules (§0)
- [ ] Both of you can answer the four questions in §0 without notes
- [ ] Deployed site loads from a cold phone on mobile data
- [ ] Demo code in `VITE_DEMO_CODE` is live and not about to expire
- [ ] `npm test && npm run lint && npm run build` clean
- [ ] `npm run test:rls` passes
- [ ] `npm run audit:ui` passes
- [ ] Someone who has never seen it can use the stranger view without you talking
