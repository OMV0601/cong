/**
 * Fills a fresh database with a realistic demo lexicon.
 *
 *   SEED_EMAIL=you@example.com SEED_PASSWORD=... node scripts/seed-demo.mjs
 *
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.local, and the
 * account to sign in as from SEED_EMAIL / SEED_PASSWORD. Nothing is hardcoded
 * and nothing secret is printed — this runs entirely through the anon key and
 * ordinary RLS, exactly as the app does, which is also a decent smoke test that
 * the policies actually permit the app's own workflow.
 *
 * Idempotent: it finds the existing demo person by name and tops up whichever
 * signals are missing, so running it twice does not produce sixteen tiles.
 *
 * Prints a share code at the end. Put that in VITE_DEMO_CODE and the landing
 * page will offer "See a real lexicon" to anyone who visits.
 */
import { createClient } from '@supabase/supabase-js'
import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURES = join(ROOT, 'fixtures')

const PERSON_NAME = process.env.SEED_PERSON ?? 'Rosa (demo)'
const GRANT_LABEL = 'Demo code'
const GRANT_HOURS = 720 // The maximum create_grant allows: 30 days.

/**
 * The lexicon itself.
 *
 * Written to be plausible rather than dramatic, and specifically to make the
 * point the product rests on: two signals that a stranger cannot tell apart and
 * a parent never confuses. "Pain hum" and "Anxious hum" are the pair the whole
 * demo turns on, so they sit next to each other and their meanings are written
 * to be genuinely hard to distinguish by description alone.
 */
const SIGNALS = [
  {
    slug: 'pain-hum',
    label: 'Pain hum',
    meaning:
      'Low, rising, does not stop when you talk to her. This one means something hurts. Check ears and stomach first — she gets ear infections and will not touch her ear to show you.',
    body_region: 'whole_body',
    is_sound: true,
    urgency: 'urgent',
    flacc_category: 'cry',
  },
  {
    slug: 'anxious-hum',
    label: 'Anxious hum',
    meaning:
      'Flatter and quieter than the pain hum, and it stops if you lower your voice or dim the lights. She is overwhelmed, not hurting. Do not start looking for an injury.',
    body_region: 'whole_body',
    is_sound: true,
    urgency: 'attention',
    flacc_category: 'cry',
  },
  {
    slug: 'legs-drawn-up',
    label: 'Drawing her legs up',
    meaning:
      'Pulling both knees toward her chest and holding them there. Stomach pain, almost always. If it comes with the pain hum, take it seriously.',
    body_region: 'legs',
    is_sound: false,
    urgency: 'urgent',
    flacc_category: 'legs',
  },
  {
    slug: 'jaw-tension',
    label: 'Jaw set',
    meaning:
      'Jaw clenched, lips pulled thin. She is bracing for something — usually because she has worked out that a procedure is coming. Telling her what you are about to do helps more than you would expect.',
    body_region: 'face',
    is_sound: false,
    urgency: 'attention',
    flacc_category: 'face',
  },
  {
    slug: 'rocking',
    label: 'Rocking',
    meaning:
      'Steady, even rocking. This is self-soothing and it is fine. It is how she copes with a room that is too loud. Do not try to stop it.',
    body_region: 'whole_body',
    is_sound: false,
    urgency: 'routine',
    flacc_category: 'activity',
  },
  {
    slug: 'hand-flick',
    label: 'Hand flick',
    meaning:
      'A quick flick at the wrist, once or twice. She is pleased about something, or she has understood what you said. It is the closest thing she has to a yes.',
    body_region: 'hands',
    is_sound: false,
    urgency: 'routine',
    flacc_category: null,
  },
  {
    slug: 'reaching',
    label: 'Reaching for your wrist',
    meaning:
      'She wants your attention on something — usually she wants you to stay, or to look where she is looking. Not a grab, and not distress.',
    body_region: 'hands',
    is_sound: false,
    urgency: 'routine',
    flacc_category: null,
  },
  {
    slug: 'going-still',
    label: 'Going completely still',
    meaning:
      'She normally moves constantly. If she goes still and stays still, something is badly wrong. This is the one people miss because nothing is happening.',
    body_region: 'whole_body',
    is_sound: false,
    urgency: 'urgent',
    flacc_category: 'consolability',
  },
]

// --- env -------------------------------------------------------------------

async function loadEnvLocal() {
  const path = join(ROOT, '.env.local')
  if (!existsSync(path)) return
  for (const line of (await readFile(path, 'utf8')).split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}

await loadEnvLocal()

const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY
const email = process.env.SEED_EMAIL
const password = process.env.SEED_PASSWORD

function die(message) {
  console.error(`\n  ${message}\n`)
  process.exit(1)
}

if (!url || !anonKey) {
  die('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (in .env.local or the environment).')
}
if (!email || !password) {
  die(
    'Set SEED_EMAIL and SEED_PASSWORD to an account that exists in this project.\n' +
      '  Create one by signing up in the app first. Never use the service role key here.'
  )
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// --- run -------------------------------------------------------------------

const { error: signInError } = await supabase.auth.signInWithPassword({
  email,
  password,
})
if (signInError) die(`Could not sign in as ${email}: ${signInError.message}`)
console.log(`Signed in as ${email}`)

if (!existsSync(FIXTURES) || (await readdir(FIXTURES)).length === 0) {
  die('fixtures/ is empty. Run: node scripts/make-fixtures.mjs')
}

// The person. Matched by name so a second run reuses the first one's lexicon
// rather than starting a parallel one.
const { data: existingPeople, error: listError } = await supabase
  .from('people')
  .select('*')
  .eq('display_name', PERSON_NAME)
if (listError) die(`Could not list people: ${listError.message}`)

let person = existingPeople?.[0]
if (person) {
  console.log(`Reusing ${PERSON_NAME}`)
} else {
  const { data, error } = await supabase.rpc('create_person', {
    p_display_name: PERSON_NAME,
  })
  if (error) die(`Could not create the demo person: ${error.message}`)
  person = data
  console.log(`Created ${PERSON_NAME}`)
}

// Marked as demo data separately, because create_person deliberately takes only
// a name — this is the one caller that ever sets the flag.
if (!person.is_demo) {
  const { error } = await supabase
    .from('people')
    .update({ is_demo: true })
    .eq('id', person.id)
  if (error) {
    die(
      `Could not mark the person as demo data: ${error.message}\n` +
        '  If this says the column does not exist, run supabase/migrations/0010_demo_flag.sql.'
    )
  }
}

// Which signals are already there?
const { data: existingSignals, error: signalsError } = await supabase
  .from('signals')
  .select('label')
  .eq('person_id', person.id)
if (signalsError) die(`Could not list signals: ${signalsError.message}`)

const have = new Set((existingSignals ?? []).map((s) => s.label))

let added = 0
for (const [index, signal] of SIGNALS.entries()) {
  if (have.has(signal.label)) {
    console.log(`  = ${signal.label} (already there)`)
    continue
  }

  const id = crypto.randomUUID()
  const videoPath = `${person.id}/${id}.webm`
  const posterPath = `${person.id}/${id}.jpg`

  const video = await readFile(join(FIXTURES, `${signal.slug}.webm`))
  const poster = await readFile(join(FIXTURES, `${signal.slug}.jpg`))

  const up = await supabase.storage
    .from('signals')
    .upload(videoPath, video, { contentType: 'video/webm', upsert: false })
  if (up.error) die(`Could not upload ${signal.slug}: ${up.error.message}`)

  const posterUp = await supabase.storage
    .from('signals')
    .upload(posterPath, poster, { contentType: 'image/jpeg', upsert: false })

  const { error } = await supabase.from('signals').insert({
    id,
    person_id: person.id,
    label: signal.label,
    meaning: signal.meaning,
    body_region: signal.body_region,
    is_sound: signal.is_sound,
    urgency: signal.urgency,
    flacc_category: signal.flacc_category,
    video_path: videoPath,
    poster_path: posterUp.error ? null : posterPath,
    mime_type: 'video/webm;codecs=vp9',
    duration_ms: 2400,
    sort_order: index,
  })
  if (error) {
    // Do not leave an orphaned object behind on a failed insert.
    await supabase.storage.from('signals').remove([videoPath, posterPath])
    die(`Could not insert ${signal.label}: ${error.message}`)
  }

  console.log(`  + ${signal.label}`)
  added++
}

// A live code for the landing page. Reuse one if it is still good, so repeated
// runs do not litter the share page with codes.
const { data: grants } = await supabase
  .from('access_grants')
  .select('*')
  .eq('person_id', person.id)
  .eq('label', GRANT_LABEL)
  .order('created_at', { ascending: false })

const live = (grants ?? []).find(
  (g) => !g.revoked_at && new Date(g.expires_at) > new Date()
)

let token = live?.token
if (!token) {
  const { data, error } = await supabase.rpc('create_grant', {
    p_person_id: person.id,
    p_label: GRANT_LABEL,
    p_hours: GRANT_HOURS,
  })
  if (error) die(`Could not create a demo code: ${error.message}`)
  token = data.token
}

console.log(`
Done. ${added} signal${added === 1 ? '' : 's'} added, ${SIGNALS.length - added} already present.

  Demo code:  ${token}
  Try it at:  /c/${token}

  To put "See a real lexicon" on the landing page, set this in .env.local and
  in Vercel, then redeploy (Vite inlines it at build time):

    VITE_DEMO_CODE=${token}

  The code expires in ${GRANT_HOURS / 24} days. Re-run this script for a fresh one.
`)

await supabase.auth.signOut()
