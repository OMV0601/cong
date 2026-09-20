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

Full design: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in your Supabase values
npm run dev
```

Open <http://localhost:5173>. The home page is a Phase 0 status board that
checks every piece of plumbing and tells you what's missing.

### Backend setup

1. Create a Supabase project.
2. Run the migrations in order, pasting each into the SQL Editor:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
3. Storage → create a bucket named `signals`, **not public**.
4. Put your project URL and **publishable (anon)** key in `.env.local`.

The publishable key is meant to be public — it ships inside the bundle. Row-Level
Security is what protects the data. The **secret / service_role key must never
appear in this repo or in the frontend.**

### Push notifications

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
Realtime, Auth) · Web Push · Vercel
