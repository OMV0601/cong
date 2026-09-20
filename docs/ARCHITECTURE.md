# Lexicon — Build Plan

**Congressional App Challenge 2026 · WA-08 · Deadline Oct 26, 12:00pm ET**
**Today: Sept 20 → ~5 weeks**

> A lexicon is the vocabulary of a language. Every non-speaking person has one.
> It just lives in one person's head.

---

## 1. The problem

Some people can't speak. They still communicate — through sounds, movements, and
expressions. Their mom reads it fluently after fifteen years. A stranger reads
none of it.

So the moment they're with a stranger — an ER nurse, a new school aide, a respite
worker — they effectively lose their voice. Not because they stopped
communicating, but because **nobody in the room speaks their language.**

The knowledge that would fix this exists. It's just locked in one person's head,
and it has never been written down in a form a stranger can use.

---

## 2. Use case

Marcus is 16. He doesn't speak. Sunday night, 11pm, the ER.

He's rocking back and forth and making a high, tight hum. The nurse sees a scared
teenager in a loud unfamiliar room, so she dims the lights and gives him a minute
to settle.

She's wrong. That hum is his pain signal, and it sounds different from the hum he
makes when he's just overwhelmed. His mom has known the difference for a decade.
She's down the hall on the phone with insurance.

**With Lexicon:** the nurse scans the code clipped to his chart. A grid of short
looping videos comes up — Marcus, filmed at home, months ago. She spots the one
that matches in about four seconds.

> **PAIN.** Not the same as his anxious hum. Check stomach and ears first.

She escalates immediately instead of forty minutes later.

---

## 3. "Why can't the nurse just call the parent?"

This is the first question anyone asks. It deserves a real answer.

**Lexicon does not replace the phone call. Phone calls are layer 3 — and they're
the part Lexicon actually fixes.**

### Five reasons calling alone fails

**1. A call makes you describe something you have no words for.**
The nurse has to say, out loud, what she's seeing. But the whole problem is that
she has no vocabulary for it. *"He's doing… something with his hand?"* Mom can't
work with that. Video skips the describing step entirely — she just *sees* it.

**2. You have to know you're confused to make the call.**
This is the big one. The nurse in our story isn't confused. She's **confidently
wrong** — she's sure it's anxiety. She'd never think to call. A grid of labeled
clips is what tells her there was something to look up.

**3. Calling costs minutes. An Ask costs eight seconds.**
Find the number, dial, wait, explain who you are and where you are, hold. Nurses
skip that on a maybe. Filming five seconds and hitting send is cheap enough that
she'll actually do it.

**4. The parent often isn't reachable — or isn't there at all.**
Driving. Asleep. In surgery themselves after the same crash. And for adults in
group homes, the parents may be elderly or gone. "Just call mom" assumes a mom
who picks up.

**5. Nothing is retained.**
Mom explains the hum. The shift changes. The next nurse starts from zero and
calls again. Every call re-teaches the same lesson to a different person.

### The feature this objection created

When an Ask gets answered, the family can tap **"save this as a signal."** The
answer becomes a permanent entry in the lexicon.

**Lexicon gets smarter every time someone is confused.** A call just evaporates.

### Honest limit — say this out loud in the video

If mom is standing right there, you ask mom. Lexicon is for the hours she isn't —
which is every school day, every respite shift, every night shift, and every
adult living away from family. That's most hours of most lives.

---

## 4. The product — four layers

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
   │                 │  30 clips → 4. Zero vocabulary needed.
   └────────┬────────┘
            │ still nothing
   ┌────────▼────────┐
   │ 3. ASK   ★      │  Film 5 seconds → send.
   │                 │  Mom's phone buzzes. She replies.
   │                 │  Answer lands on the nurse's screen.
   │                 │  → can be saved as a new signal
   └────────┬────────┘
            │ nobody knows
   ┌────────▼────────┐
   │ 4. HONEST NO    │  "We don't know what this is."
   │                 │  Never guesses to seem useful.
   └─────────────────┘
```

### The one rule

> **Lexicon never interprets. It only retrieves.**

No AI decides what a signal means. A wrong automatic pain reading is more
dangerous than no reading. The app finds candidates; **the human confirms against
the person in front of them.** We advertise this, we don't hide it.

---

## 5. Tech stack

| Piece | Choice | Why |
|---|---|---|
| Frontend | React + Vite + TypeScript | Familiar, fast |
| Styling | Tailwind CSS | Speed |
| Components | shadcn/ui + Radix | Accessible by default — matters here |
| Parent app | PWA (`vite-plugin-pwa`) | Required for push |
| Database | Supabase Postgres | Real schema, real SQL |
| Video | Supabase Storage, private bucket | Signed URLs only |
| Live updates | Supabase Realtime | Answer appears with no refresh |
| Auth | Supabase Auth | Family accounts |
| Security | Postgres Row-Level Security | Enforced by the database, not our code |
| Search | Postgres full-text search | No embeddings needed |
| Push | Web Push + VAPID from a Supabase Edge Function | Free, no phone numbers |
| Recording | `MediaRecorder` browser API | Nothing to install |
| Hosting | Vercel | Free, instant deploys |

**Why web, not a native app:** an ER nurse will never install an app. She scans a
code and it opens. That's a requirement, not a convenience.

---

## 6. Database — seven tables

```sql
people            -- the non-speaking person
  id, display_name, avatar_url, created_by, created_at

signals           -- one clip = one dictionary entry
  id, person_id, label, meaning, body_region, is_sound,
  urgency, flacc_category, video_path, poster_path,
  mime_type, duration_ms, sort_order, source_ask_id, created_at
  -- body_region: hands | face | legs | whole_body | other
  -- source_ask_id: set when promoted from an answered Ask

circle_members    -- who can see this person, who can answer
  id, person_id, user_id, role, can_answer, created_at

access_grants     -- the scannable code. short-lived, revocable
  id, person_id, token, label, expires_at,
  created_by, revoked_at, created_at

ask_requests      -- layer 3
  id, person_id, grant_id, clip_path, note, status,
  answered_by, answer_text, answer_signal_id,
  created_at, answered_at

push_subscriptions
  id, user_id, endpoint, p256dh, auth, created_at

access_log        -- every view. families can see who looked
  id, person_id, grant_id, action, signal_id, created_at
```

**Row-Level Security on every table.** A scan code can read one person's signals
and nothing else — enforced in Postgres, not in our frontend.

---

## 7. How Ask works (explain this in the video)

```
NURSE                     SUPABASE                  PARENT'S PHONE
  │                           │                           │
  │ records 5s (MediaRecorder)│                           │
  │──── upload to Storage ───►│                           │
  │──── insert ask_request ──►│                           │
  │                      DB trigger fires                 │
  │                           │                           │
  │                  Edge Function (Deno):                │
  │                  • find circle members that can answer│
  │                  • load their push subscriptions      │
  │                  • sign with VAPID key                │
  │                           │──── Web Push ────────────►│
  │                           │                   service worker
  │                           │                   shows notification
  │                           │◄─── answer ───────────────│
  │◄── Realtime websocket ────│                           │
  │                                                       │
  │  Answer appears. She never touched the screen.        │
```

---

## 8. Phases

Every phase ends with something **deployed and demo-able.** Nothing is "done
later."

### Phase 0 — Foundation · half a day
Vite + React + TS + Tailwind + shadcn. Supabase project. Schema + RLS migrations.
Deploy the empty shell to Vercel.
**Demo:** a live URL.

### Phase 1 — The dictionary works · 2 days ← *the couple-of-days web app*
Auth. Create a person. Record a clip in the browser, label it, tag body region,
save to Storage. See your clips in a grid.
**Demo:** record a clip on your phone, watch it appear. The app is real.

### Phase 2 — A stranger can use it · 2 days
Generate a QR grant. Logged-out `/c/:token` route. **Layer 1** grid of looping
clips. **Layer 2** body-region filters. Expiry + revoke.
**Demo:** scan from a second phone, find a signal in 4 seconds.

### Phase 3 — Ask · 3 days ★ *riskiest, most important*
Record + upload from the stranger view. DB trigger → Edge Function → Web Push.
Parent's inbox. Answer flows back over Realtime.
**Demo:** the full loop, two phones, under 30 seconds. **This is the video.**

Also in this phase: **side-by-side confirmation.**

When a stranger thinks they have found a match, they film ~3 seconds of what
they are actually looking at. The app shows **their clip next to the family's
clip**, and they confirm it is the same thing. The confirmation is written to
`access_log` — *confirmed match, 3 Oct, Overlake ER.*

Why this and not automatic matching:

- **It does not break the one rule.** Lexicon never interprets. A model that
  watches a child and decides "that is the pain hum" is exactly the thing this
  product refuses to do, and the refusal is what earns a clinician's trust.
  Trading that for a weaker claim is a bad trade.
- **It is honest.** Few-shot matching of idiosyncratic movement, on bodies that
  move atypically, is a research problem. It would be unreliable on camera and
  unfalsifiable in a three-minute video.
- **It demos better.** Two clips side by side, one labelled, is legible in a
  single frame. An AI confidence score is not.
- **It is nearly free.** It reuses the Ask recorder and the existing grid.

The automated version belongs in "What's next" as a named future step with the
reason it is not in v1 — a wrong pain reading is worse than no reading. Stating
that reads as judgement rather than as a missing feature.

### Phase 4 — Trust + growth · 2 days
**Layer 4** Honest No. Access log visible to family. FLACC/NCCPC tagging.
Full-text search. **Promote an answered Ask into a signal.** RLS hardening.
**Demo:** show the access log and say "the family sees every view."

### Phase 5 — Ship · rest of the time
Design pass. Film real demo clips. Record and edit the 3-minute video. Write the
submission. **Submit Oct 24 — not the 26th.**

---

## 9. Front-end design

The subject matter is accessibility. **If the app itself isn't accessible, that's
fatal** — a judge will check, and it would be embarrassing.

### Non-negotiables
- **WCAG AA contrast everywhere.** Verify with [whocanuse](https://whocanuse.com)
  and [Colorable](https://colorable.jxnblk.com/) — not by eye
- **Touch targets ≥ 44px.** The stranger is using this one-handed, in a hurry
- **Keyboard navigable, real focus rings.** shadcn/Radix gives this free
- **Works in bad light** — a dim ER room, a bright classroom window
- **No motion that can't be turned off** (`prefers-reduced-motion`)

### The look
Calm and clinical, not techy. This sits next to a hospital bed. It should feel
like a well-made medical tool, not a startup landing page.

- **Palette:** one restrained set, built in [Coolors](https://coolors.co) or
  [Huemint](https://huemint.com/). Neutral base, **one** accent. Red reserved
  exclusively for urgency — never decoration
- **Type:** one family, two weights, from [Fontshare](https://www.fontshare.com/)
  or [Google Fonts](https://fonts.google.com/). Pair-check on
  [Fontjoy](https://fontjoy.com/)
- **Icons:** [Lucide](https://lucide.dev) or
  [Tabler](https://tabler-icons.io/) — one set only, never mixed
- **Components:** [shadcn/ui](https://ui.shadcn.com/) over
  [Radix](https://www.radix-ui.com/)

### The rule that matters most
**The video grid is the product. The interface should disappear.** No gradients,
no glassmorphism, no floating cards. Big clips, clear labels, nothing else
competing for the eye.

---

## 10. Known risks

| Risk | Plan |
|---|---|
| **iOS push needs add-to-home-screen first** | Test on the real demo phone in **Phase 0**, not Phase 5. Four weeks of room to switch to SMS if it fails |
| **Safari records mp4, Chrome records webm** | Feature-detect `MediaRecorder.isTypeSupported`, store `mime_type` per clip |
| **Video autoplay blocked** | Every clip `muted` + `playsinline` + `loop`. Non-negotiable for Layer 1 |
| **File sizes** | Hard cap 5s, 720p, generate a poster frame |
| **Demo clips don't exist** | Phase 5 films them. Use ourselves as stand-ins and **say so on screen** |

---

## 11. Verification

**End-to-end, on two real devices:**
1. Record 3 clips → they appear in the grid
2. Generate QR → scan from a **second, logged-out** device → grid loads
3. Filter to `hands` → only hand clips show
4. Send an Ask from device 2
5. Parent's phone gets the push **with the app closed**
6. Parent answers → appears on device 2 **without refreshing**
7. `access_log` has a row for every view

**Automated:**
- Vitest — filter logic, FLACC mapping, mime-type detection
- Playwright — one test walking steps 1–6 (Chromium is preinstalled here)
- SQL — hit the REST API with a **revoked** token, confirm zero rows

**RLS must be proven in SQL, not through the UI.** The UI hiding a button is not
security.

---

## 12. Open items

- Demo clips: use ourselves as acknowledged stand-ins, or real families with
  written consent. Decide by Phase 3
- This plan gets committed as `docs/ARCHITECTURE.md` in Phase 0
