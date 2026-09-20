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

**Lexicon never interprets. It only retrieves.** No model decides what a signal
means; the human confirms against the person in front of them.

Full design and phase-by-phase plan: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## What works today

**The family**

- Sign in, or continue as a guest
- Add a person, record short clips of their real signals
- Label each one: what you call it, what it means, where on the body it
  happens, whether it's a sound, how urgent it is, and optionally a FLACC
  category
- See the whole lexicon as a grid of looping clips, with per-clip audio
- Create a share code with a label and a lifetime, show its QR, revoke it
  instantly
- An inbox for questions, with a count of what's waiting

**The stranger** — an ER nurse, a new aide, a respite worker. No account, no
install. They scan a code and it opens.

- **Layer 1 — Look.** Every clip, looping, all at once
- **Layer 2 — Point.** Narrow by where it's happening, or "it's a sound".
  Only filters that would return something are offered, because a dead end
  costs seconds they don't have
- **Layer 3 — Ask.** Nothing matched? Film what you're actually seeing and
  send it. The answer arrives on its own, over a websocket — no refresh, no
  second tap
- **Layer 4 — Honest No.** "We don't recognise this one" is a real answer the
  family can give. A guess dressed up as help is worse than admitting it

**Side-by-side confirmation.** Think you've found the match? Film what you're
seeing and the two clips play next to each other, so a person can judge it.
Deliberately not automatic: what gets recorded is what a human concluded,
never what a model thought. A wrong pain reading is more dangerous than no
reading.

**Growth.** An answered question can be saved as a permanent signal, so the
next stranger never has to ask it. That's the thing a phone call can't do.

## Still to come

- ⬜ Web Push, so the phone buzzes with the app closed (Realtime works today,
  but the tab has to stay open)
- ⬜ Access log surfaced to the family — every scan and view is already
  recorded
- ⬜ Full-text search across signals
- ⬜ Visual design pass, demo clips, submission video

---

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev
```

Open <http://localhost:5173>. If the backend isn't configured yet, the home
page is a status board that checks every piece of plumbing and tells you
what's missing — once everything is green you'll land on sign in instead.

### Backend setup

1. Create a Supabase project.
2. Storage → create a bucket named `signals`, **not public**.
3. Run every file in `supabase/migrations/` **in numerical order**, pasting
   each into the SQL Editor:

   | File | What it does |
   |---|---|
   | `0001_schema.sql` | Tables, enums, full-text search |
   | `0002_rls.sql` | Row-Level Security on every table |
   | `0003_create_person_fix.sql` | Atomic person + circle creation |
   | `0004_storage_policies.sql` | Storage RLS for the `signals` bucket |
   | `0005_grants.sql` | Share codes and the stranger's session |
   | `0006_token_fix.sql` | Token generation without pgcrypto |
   | `0007_asks.sql` | Ask, confirmation, and Realtime |

4. Authentication → Sign In / Providers → enable **anonymous sign-ins**. The
   stranger view needs a real `auth.uid()`; it is what lets Storage and
   Realtime treat a code holder like any other user instead of threading a
   secret through every request.
5. Put your project URL and **publishable (anon)** key in `.env.local`.
6. Same three values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
   `VITE_VAPID_PUBLIC_KEY`) also need to be set in **Vercel → Settings →
   Environment Variables** for the deployed site — a `.env.local` file only
   affects your own machine. Vite bakes these in at build time, so a
   **Redeploy** is required after adding or changing any of them.

The publishable key is meant to be public — it ships inside the bundle. Row-Level
Security is what protects the data. The **secret / service_role key must never
appear in this repo or in the frontend.**

### Push notifications — not wired up yet

Answers reach a waiting stranger over Realtime today, which needs the tab to
stay open. Web Push (the phone buzzing with the app closed) still needs an
Edge Function deployed. The keypair generator is ready:

```bash
npm run vapid
```

Public key → `.env.local` and Vercel env vars.
Private key → written to `.vapid-private.local` (git-ignored, never printed);
paste it into Supabase → Edge Functions → Secrets, then delete the file.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Typecheck + production build |
| `npm test` | Unit tests |
| `npm run lint` | Lint |
| `npm run vapid` | Generate a Web Push keypair |

## Stack

React 19 · Vite · TypeScript · Tailwind v4 · Supabase (Postgres, Storage,
Realtime, Auth) · Vercel
