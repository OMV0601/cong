/**
 * Proves the security model holds, against a real project, using only the anon
 * key.
 *
 *   SEED_EMAIL=you@example.com SEED_PASSWORD=... npm run test:rls
 *
 * The RLS policies in supabase/migrations/ ARE the security model. Everything
 * else in Lexicon is a convenience on top of them: the stranger's whole API
 * surface is a handful of security-definer functions, and if one of those
 * leaks, a family's private medical vocabulary leaks with it. Until now that
 * was verified by hand, which means it was verified once, on whatever the
 * schema looked like that afternoon.
 *
 * This uses no service role key and no privileged access of any kind. It is a
 * hostile client holding exactly what an attacker would hold — the publishable
 * key that ships in the JS bundle — and it asserts that the doors are shut.
 *
 * It creates two throwaway people, tries to cross between them, and deletes
 * everything at the end. Safe to run against the project you demo from, but
 * prefer a scratch project if you have one.
 */
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

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

if (!url || !anonKey) {
  console.error('\n  Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.\n')
  process.exit(1)
}
if (!email || !password) {
  console.error(
    '\n  Set SEED_EMAIL and SEED_PASSWORD to an account in this project.' +
      '\n  Never put a service role key in here — the whole point is that this' +
      '\n  runs with no more power than a stranger has.\n'
  )
  process.exit(1)
}

if (anonKey.startsWith('sb_secret') || anonKey.includes('service_role')) {
  console.error('\n  That looks like a secret key. This test must run with the publishable key.\n')
  process.exit(1)
}

const client = () =>
  createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

// --- tiny harness -----------------------------------------------------------

let passed = 0
const failures = []
let group = ''

function section(name) {
  group = name
  console.log(`\n${name}`)
}

function ok(what) {
  passed++
  console.log(`  ✓ ${what}`)
}

function fail(what, detail) {
  failures.push(`${group} → ${what}${detail ? `\n      ${detail}` : ''}`)
  console.log(`  ✗ ${what}`)
  if (detail) console.log(`      ${detail}`)
}

/** Asserts a read returned nothing — whether by error or by an empty set. */
function assertNoRows(what, { data, error }) {
  if (error) return ok(`${what} (denied: ${error.code ?? error.message})`)
  if (Array.isArray(data) && data.length === 0) return ok(`${what} (zero rows)`)
  fail(what, `LEAKED ${Array.isArray(data) ? data.length : 1} row(s)`)
}

/** Asserts a call failed. A success here is a hole. */
function assertDenied(what, { error }) {
  if (error) return ok(`${what} (denied: ${error.code ?? error.message})`)
  fail(what, 'SUCCEEDED — this should have been refused')
}

function assertAllowed(what, { data, error }) {
  if (error) return fail(what, `refused: ${error.message}`)
  if (Array.isArray(data) && data.length === 0) {
    return fail(what, 'returned zero rows — the policy is too tight')
  }
  ok(what)
}

// --- set-up -----------------------------------------------------------------

const owner = client()
{
  const { error } = await owner.auth.signInWithPassword({ email, password })
  if (error) {
    console.error(`\n  Could not sign in as ${email}: ${error.message}\n`)
    process.exit(1)
  }
}
console.log(`Signed in as ${email}`)

const stamp = Date.now()
const NAME_A = `RLS test A ${stamp}`
const NAME_B = `RLS test B ${stamp}`
const created = { people: [], objects: [] }

async function makePerson(name) {
  const { data, error } = await owner.rpc('create_person', { p_display_name: name })
  if (error) throw new Error(`create_person(${name}): ${error.message}`)
  created.people.push(data.id)
  return data
}

async function makeSignal(personId, label) {
  const id = crypto.randomUUID()
  const path = `${personId}/${id}.webm`
  const body = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0])
  const up = await owner.storage
    .from('signals')
    .upload(path, body, { contentType: 'video/webm' })
  if (up.error) throw new Error(`upload(${label}): ${up.error.message}`)
  created.objects.push(path)

  const { error } = await owner.from('signals').insert({
    id,
    person_id: personId,
    label,
    meaning: 'created by scripts/test-rls.mjs',
    body_region: 'other',
    is_sound: false,
    urgency: 'routine',
    video_path: path,
    mime_type: 'video/webm',
    duration_ms: 1000,
    sort_order: 0,
  })
  if (error) throw new Error(`insert signal(${label}): ${error.message}`)
  return { id, path }
}

async function makeGrant(personId, label, hours = 24) {
  const { data, error } = await owner.rpc('create_grant', {
    p_person_id: personId,
    p_label: label,
    p_hours: hours,
  })
  if (error) throw new Error(`create_grant(${label}): ${error.message}`)
  return data
}

/** A stranger: anonymous auth, then exchange a token for a session. */
async function stranger(token) {
  const c = client()
  const { error } = await c.auth.signInAnonymously()
  if (error) {
    throw new Error(
      `signInAnonymously failed: ${error.message}\n` +
        '  Enable anonymous sign-ins: Authentication → Providers.'
    )
  }
  if (token) await c.rpc('claim_grant', { p_token: token })
  return c
}

let personA, personB, signalA, signalB, grantA, grantB
try {
  personA = await makePerson(NAME_A)
  personB = await makePerson(NAME_B)
  signalA = await makeSignal(personA.id, 'Signal A')
  signalB = await makeSignal(personB.id, 'Signal B')
  grantA = await makeGrant(personA.id, 'RLS test A')
  grantB = await makeGrant(personB.id, 'RLS test B')
  console.log(`Created two throwaway people and their lexicons\n`)
} catch (e) {
  console.error(`\n  Set-up failed: ${e.message}\n`)
  process.exit(1)
}

// --- 1. the anon role reads nothing -----------------------------------------

section('1. A caller with no session reads nothing')
{
  // No sign-in at all: the bare publishable key, which is what ships in the
  // bundle and what anybody can lift out of it.
  const naked = client()
  for (const table of ['signals', 'people', 'ask_requests', 'access_log', 'access_grants', 'grant_sessions', 'push_subscriptions']) {
    assertNoRows(`anon SELECT on ${table}`, await naked.from(table).select('*').limit(5))
  }
}

section('2. A signed-in stranger with no grant reads nothing')
{
  const nobody = await stranger(null)
  for (const table of ['signals', 'people', 'ask_requests', 'access_log']) {
    assertNoRows(`no-grant SELECT on ${table}`, await nobody.from(table).select('*').limit(5))
  }
  assertDenied(
    'signals_for_person without a grant',
    await nobody.rpc('signals_for_person', { p_person_id: personA.id })
  )
  assertDenied(
    'access_log_for_person without membership',
    await nobody.rpc('access_log_for_person', { p_person_id: personA.id })
  )
  assertDenied(
    'asks_for_person without membership',
    await nobody.rpc('asks_for_person', { p_person_id: personA.id })
  )
  await nobody.auth.signOut()
}

// --- 3. cross-person isolation ----------------------------------------------

section('3. A grant for one person is not a grant for another')
{
  const holderA = await stranger(grantA.token)
  assertAllowed(
    'grant holder reads their own person’s signals',
    await holderA.rpc('signals_for_person', { p_person_id: personA.id })
  )
  assertDenied(
    'grant holder reads a DIFFERENT person’s signals',
    await holderA.rpc('signals_for_person', { p_person_id: personB.id })
  )
  assertDenied(
    'grant holder signs a URL for a different person’s clip',
    await holderA.storage.from('signals').createSignedUrl(signalB.path, 60)
  )
  assertNoRows(
    'grant holder SELECTs signals directly',
    await holderA.from('signals').select('*').limit(5)
  )
  await holderA.auth.signOut()
}

// --- 4. one stranger's Ask clip is not another stranger's to read ------------

section('4. One stranger cannot browse another stranger’s Ask clips')
{
  const asker = await stranger(grantA.token)
  const askId = crypto.randomUUID()
  const askPath = `${personA.id}/asks/${askId}.webm`
  const up = await asker.storage
    .from('signals')
    .upload(askPath, new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]), {
      contentType: 'video/webm',
    })

  if (up.error) {
    fail('a grant holder can upload into <person>/asks/', up.error.message)
  } else {
    ok('a grant holder can upload into <person>/asks/')
    created.objects.push(askPath)

    const { error: askError } = await asker.rpc('create_ask', {
      p_person_id: personA.id,
      p_clip_path: askPath,
      p_note: 'created by scripts/test-rls.mjs',
    })
    if (askError) fail('create_ask succeeds for a grant holder', askError.message)
    else ok('create_ask succeeds for a grant holder')

    // A SECOND stranger, same person, same valid grant.
    const other = await stranger(grantA.token)
    assertDenied(
      'a second grant holder signs a URL for that Ask clip',
      await other.storage.from('signals').createSignedUrl(askPath, 60)
    )
    await other.auth.signOut()

    // The family can, because answering means watching it.
    assertAllowed(
      'the circle CAN read the Ask clip',
      await owner.storage.from('signals').createSignedUrl(askPath, 60)
    )
  }

  assertDenied(
    'a grant holder uploads OUTSIDE the asks folder',
    await asker.storage
      .from('signals')
      .upload(`${personA.id}/${crypto.randomUUID()}.webm`, new Uint8Array([1, 2, 3]), {
        contentType: 'video/webm',
      })
  )
  await asker.auth.signOut()
}

// --- 5. revocation kills a session that was already issued -------------------

section('5. Revoking a code kills sessions already issued from it')
{
  const holder = await stranger(grantA.token)
  assertAllowed(
    'before revoking, the holder can read',
    await holder.rpc('signals_for_person', { p_person_id: personA.id })
  )

  const { error: revokeError } = await owner.rpc('revoke_grant', { p_grant_id: grantA.id })
  if (revokeError) fail('revoke_grant succeeds', revokeError.message)
  else ok('revoke_grant succeeds')

  // The crucial one. The session row still exists and has not expired; what
  // must stop it is has_grant_for re-checking the parent grant every time,
  // rather than trusting the session it already issued.
  assertDenied(
    'the ALREADY-ISSUED session stops working immediately',
    await holder.rpc('signals_for_person', { p_person_id: personA.id })
  )
  assertDenied(
    'the revoked token can no longer be claimed',
    await holder.rpc('claim_grant', { p_token: grantA.token })
  )
  assertDenied(
    'the revoked holder can no longer sign clip URLs',
    await holder.storage.from('signals').createSignedUrl(signalA.path, 60)
  )
  await holder.auth.signOut()
}

// --- 6. expiry behaves the same as revocation --------------------------------

section('6. An expired code behaves the same as a revoked one')
{
  const holder = await stranger(grantB.token)
  assertAllowed(
    'before expiry, the holder can read',
    await holder.rpc('signals_for_person', { p_person_id: personB.id })
  )

  // create_grant clamps to a minimum of one hour, so expiry is forced through
  // the circle member's own UPDATE policy rather than fabricated.
  const { error: expireError } = await owner
    .from('access_grants')
    .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
    .eq('id', grantB.id)
  if (expireError) fail('the circle can expire its own code', expireError.message)
  else ok('the circle can expire its own code')

  assertDenied(
    'the already-issued session stops working once the code expires',
    await holder.rpc('signals_for_person', { p_person_id: personB.id })
  )
  assertDenied(
    'the expired token can no longer be claimed',
    await holder.rpc('claim_grant', { p_token: grantB.token })
  )
  await holder.auth.signOut()
}

// --- 7. the circle can still do its job --------------------------------------

section('7. A circle member CAN do all of this for their own person')
{
  assertAllowed('read their people', await owner.from('people').select('*').eq('id', personA.id))
  assertAllowed('read their signals', await owner.from('signals').select('*').eq('person_id', personA.id))
  assertAllowed('signals_for_person as a member', await owner.rpc('signals_for_person', { p_person_id: personA.id }))
  assertAllowed('sign a URL for their own clip', await owner.storage.from('signals').createSignedUrl(signalA.path, 60))
  assertAllowed('read their own activity log', await owner.rpc('access_log_for_person', { p_person_id: personA.id, p_limit: 10 }))

  const asks = await owner.rpc('asks_for_person', { p_person_id: personA.id })
  if (asks.error) fail('read their own inbox', asks.error.message)
  else ok('read their own inbox')

  const search = await owner.rpc('search_signals_for_person', { p_person_id: personA.id, p_query: 'Signal' })
  if (search.error) fail('search their own lexicon', search.error.message)
  else if ((search.data ?? []).length === 0) fail('search their own lexicon', 'returned nothing for a label that exists')
  else ok('search their own lexicon')
}

// --- 8. a member of one circle is not a member of every circle ---------------

section('8. Reading is scoped to circles the caller actually belongs to')
{
  const outsider = await stranger(null)
  assertDenied(
    'a non-member calls create_grant for someone else’s person',
    await outsider.rpc('create_grant', { p_person_id: personA.id, p_label: 'nope', p_hours: 1 })
  )
  assertDenied(
    'a non-member calls revoke_grant on someone else’s code',
    await outsider.rpc('revoke_grant', { p_grant_id: grantB.id })
  )
  assertNoRows(
    'a non-member SELECTs access_grants',
    await outsider.from('access_grants').select('*').limit(5)
  )
  await outsider.auth.signOut()
}

// --- clean-up ----------------------------------------------------------------

console.log('\nCleaning up')
if (created.objects.length) {
  await owner.storage.from('signals').remove(created.objects)
}
for (const id of created.people) {
  // Cascades the signals, grants, sessions, asks and log rows with it.
  const { error } = await owner.from('people').delete().eq('id', id)
  if (error) console.log(`  ! could not delete ${id}: ${error.message}`)
}
await owner.auth.signOut()

// --- verdict -----------------------------------------------------------------

console.log(`\n${'='.repeat(60)}`)
if (failures.length === 0) {
  console.log(`  ${passed} assertions passed. The security model holds.`)
  console.log(`${'='.repeat(60)}\n`)
  process.exit(0)
}

console.log(`  ${passed} passed, ${failures.length} FAILED\n`)
for (const failure of failures) console.log(`  - ${failure}`)
console.log(`\n  A failure here is a real leak, not a flaky test. Do not ship.`)
console.log(`${'='.repeat(60)}\n`)
process.exit(1)
