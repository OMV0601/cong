/**
 * Screenshots every route at phone and desktop width, and fails on the two
 * accessibility rules that are non-negotiable for this project.
 *
 *   npm run audit:ui
 *
 * Builds its own bundle, so it needs no prior build and does not care what is
 * in .env.local.
 *
 * Lexicon is an accessibility product. If the app itself is not accessible,
 * nothing else about the submission matters, and "we checked it by eye" is not
 * a claim worth making. So the rules that can be measured are measured:
 *
 *   1. Every form control has an accessible name.
 *   2. Every interactive target is at least 44x44 CSS pixels.
 *
 * Colour contrast is checked separately and more precisely, against the tokens
 * themselves, in src/styles.test.ts.
 *
 * The backend is stubbed rather than reached. Partly because a UI audit should
 * not depend on the state of a live database, and partly because it is the only
 * way to render the signed-in routes deterministically — the same lexicon, the
 * same clips, every run.
 *
 * Screenshots land in .ui-audit/ (git-ignored). They are for looking at, not
 * for diffing: this script fails on measurements, never on pixels.
 */
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { readFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, extname, join, normalize } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const FIXTURES = join(ROOT, 'fixtures')
const SHOTS = join(ROOT, '.ui-audit')
const DIST = join(SHOTS, 'dist')

const PROJECT_REF = 'audit'
const MIN_TARGET = 44

/*
 * Builds its own bundle rather than auditing whatever is in dist/.
 *
 * supabase-js keys its stored session on the project ref from the URL that was
 * baked in at build time, so a bundle built against a real project ignores the
 * stub session this script installs — and every signed-in route quietly
 * redirects to sign-in. The audit still reports "no violations", because a
 * sign-in screen has no violations. That is the worst kind of green.
 *
 * So: one build, with known env, owned by this script.
 */
console.log('Building with a stub backend…')
execFileSync(
  'npx',
  ['vite', 'build', '--outDir', DIST, '--emptyOutDir', '--logLevel', 'warn'],
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      VITE_SUPABASE_URL: `https://${PROJECT_REF}.supabase.co`,
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_auditstub',
      VITE_VAPID_PUBLIC_KEY:
        'BJtFm41uCnQCvSwqW22QmbSND9pBLRDJ39v0ysMrgWXDtXfoRIEBbZrUeACSURLeuMg5-eZqqkBif8k-9HDDkWg',
      VITE_DEMO_CODE: 'demotoken',
    },
  }
)

if (!existsSync(DIST)) {
  console.error('\n  Build produced no output.\n')
  process.exit(1)
}

// --- a static server for dist/ ---------------------------------------------

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  let file = join(DIST, normalize(url.pathname))
  // Same fall-through the SPA rewrite does in production: a path with no file
  // extension is a route, not an asset.
  if (!existsSync(file) || extname(file) === '') file = join(DIST, 'index.html')
  try {
    const body = await readFile(file)
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
    })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
})

await new Promise((resolve) => server.listen(0, resolve))
const BASE = `http://127.0.0.1:${server.address().port}`

// --- the stub lexicon -------------------------------------------------------

const PERSON = {
  id: '11111111-1111-1111-1111-111111111111',
  display_name: 'Rosa',
  avatar_url: null,
  created_by: 'u1',
  is_demo: true,
  created_at: '2026-03-01T10:00:00Z',
}

const CLIP_SLUGS = [
  'pain-hum',
  'anxious-hum',
  'legs-drawn-up',
  'jaw-tension',
  'rocking',
  'hand-flick',
]

const SIGNALS = CLIP_SLUGS.map((slug, i) => ({
  id: `sig-${i}`,
  person_id: PERSON.id,
  label: ['Pain hum', 'Anxious hum', 'Drawing her legs up', 'Jaw set', 'Rocking', 'Hand flick'][i],
  meaning: [
    'Low, rising, does not stop when you talk to her. Check ears and stomach first.',
    'Flatter and quieter. She is overwhelmed, not hurting.',
    'Both knees to her chest. Stomach pain, almost always.',
    'Jaw clenched, lips thin. She is bracing for something.',
    'Steady and even. Self-soothing, and it is fine.',
    'A quick flick at the wrist. The closest thing she has to a yes.',
  ][i],
  body_region: ['whole_body', 'whole_body', 'legs', 'face', 'whole_body', 'hands'][i],
  is_sound: i < 2,
  urgency: ['urgent', 'attention', 'urgent', 'attention', 'routine', 'routine'][i],
  flacc_category: null,
  video_path: `${PERSON.id}/${slug}.webm`,
  poster_path: `${PERSON.id}/${slug}.jpg`,
  mime_type: 'video/webm',
  duration_ms: 2400,
  sort_order: i,
  source_ask_id: null,
  created_at: '2026-03-01T10:00:00Z',
}))

const ASKS = [
  {
    id: 'ask-1',
    person_id: PERSON.id,
    grant_id: 'g1',
    clip_path: `${PERSON.id}/pain-hum.webm`,
    note: 'Started about ten minutes ago.',
    status: 'pending',
    answered_by: null,
    answer_text: null,
    answer_signal_id: null,
    created_at: '2026-03-02T22:40:00Z',
    answered_at: null,
  },
  {
    id: 'ask-2',
    person_id: PERSON.id,
    grant_id: 'g1',
    clip_path: `${PERSON.id}/rocking.webm`,
    note: null,
    status: 'answered',
    answered_by: 'u1',
    answer_text: 'That is her rocking. It is self-soothing — leave her to it.',
    answer_signal_id: 'sig-4',
    created_at: '2026-03-02T19:10:00Z',
    answered_at: '2026-03-02T19:12:00Z',
  },
]

const GRANTS = [
  {
    id: 'g1',
    person_id: PERSON.id,
    token: 'demotoken',
    label: 'Overlake ER',
    expires_at: '2030-01-01T00:00:00Z',
    created_by: 'u1',
    revoked_at: null,
    created_at: '2026-03-02T18:00:00Z',
  },
]

const ACTIVITY = [
  { id: 'l1', action: 'opened', created_at: new Date().toISOString(), grant_label: 'Overlake ER', signal_label: null },
  { id: 'l2', action: 'confirmed_match', created_at: new Date().toISOString(), grant_label: 'Overlake ER', signal_label: 'Pain hum' },
  { id: 'l3', action: 'asked', created_at: new Date(Date.now() - 864e5).toISOString(), grant_label: 'Overlake ER', signal_label: null },
]

const RPC = {
  signals_for_person: SIGNALS,
  search_signals_for_person: SIGNALS,
  asks_for_person: ASKS,
  access_log_for_person: ACTIVITY,
  claim_grant: [
    {
      person_id: PERSON.id,
      person_name: PERSON.display_name,
      expires_at: '2030-01-01T00:00:00Z',
      is_demo: true,
    },
  ],
  create_person: PERSON,
  person_for_token: PERSON.id,
}

async function installStubs(page) {
  await page.route('**/auth/v1/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'u1',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'parent@example.com',
      }),
    })
  )

  await page.route('**/rest/v1/rpc/*', (route) => {
    const name = route.request().url().split('/rpc/')[1].split('?')[0]
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(RPC[name] ?? null),
    })
  })

  await page.route('**/rest/v1/*', (route) => {
    const url = route.request().url()
    const table = url.split('/rest/v1/')[1].split('?')[0]
    const body =
      table === 'people'
        ? [PERSON]
        : table === 'signals'
          ? SIGNALS
          : table === 'access_grants'
            ? GRANTS
            : table === 'ask_requests'
              ? ASKS
              : []
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })

  // Signed URLs point back at this server, where the real fixture clips are
  // served — so the grid screenshots show actual moving video rather than the
  // empty boxes a fully-faked backend would give.
  await page.route('**/storage/v1/object/sign/**', async (route) => {
    const payload = route.request().postDataJSON?.() ?? {}
    const paths = payload.paths ?? [payload.path]
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        paths.map((path) => ({
          path,
          signedURL: `/__fixture/${String(path).split('/').pop()}`,
        }))
      ),
    })
  })

  await page.route('**/__fixture/*', async (route) => {
    const name = route.request().url().split('/__fixture/')[1]
    try {
      const body = await readFile(join(FIXTURES, name))
      route.fulfill({
        status: 200,
        contentType: name.endsWith('.jpg') ? 'image/jpeg' : 'video/webm',
        body,
      })
    } catch {
      route.fulfill({ status: 404, body: '' })
    }
  })
}

const SESSION = JSON.stringify({
  access_token: 'stub',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'stub',
  user: {
    id: 'u1',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'parent@example.com',
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
  },
})

// --- the audit --------------------------------------------------------------

/**
 * Runs in the page. Kept as one function so there is a single definition of
 * what "interactive" and "labelled" mean.
 */
const AUDIT = () => {
  const MIN = 44
  const visible = (el) => {
    const style = getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    if (Number(style.opacity) === 0) return false
    const r = el.getBoundingClientRect()
    return r.width > 0 && r.height > 0
  }

  const describe = (el) => {
    const id = el.id ? `#${el.id}` : ''
    const cls = el.className?.toString?.().slice(0, 40) ?? ''
    return `${el.tagName.toLowerCase()}${id}${cls ? ` .${cls.split(' ')[0]}` : ''}`
  }

  const accessibleName = (el) => {
    if (el.getAttribute('aria-label')?.trim()) return true
    const labelledBy = el.getAttribute('aria-labelledby')
    if (labelledBy && labelledBy.split(/\s+/).some((i) => document.getElementById(i))) return true
    if (el.id && document.querySelector(`label[for="${CSS.escape(el.id)}"]`)) return true
    if (el.closest('label')) return true
    if (el.getAttribute('title')?.trim()) return true
    return false
  }

  const unlabelled = []
  for (const el of document.querySelectorAll('input, select, textarea')) {
    if (el.type === 'hidden') continue
    if (!visible(el)) continue
    if (!accessibleName(el)) unlabelled.push(describe(el))
  }

  const small = []
  for (const el of document.querySelectorAll(
    'button, a[href], [role="button"], input:not([type="hidden"]), select, textarea, summary'
  )) {
    if (!visible(el)) continue
    // An inline link inside a paragraph is part of a sentence, not a tap
    // target sized independently of its line.
    if (el.tagName === 'A' && el.closest('p, figcaption')) continue
    const r = el.getBoundingClientRect()
    if (r.height + 0.5 < MIN || r.width + 0.5 < MIN) {
      small.push(`${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`)
    }
  }

  return { unlabelled, small }
}

/**
 * `expect` is a string that must appear on the rendered page.
 *
 * Without it this script cannot tell a clean page from a page that never
 * loaded: a sign-in screen has no unlabelled inputs and no small targets, so
 * an auth redirect would report as a pass. Every route now has to prove it is
 * the route it claims to be.
 */
const ROUTES = [
  { name: 'landing', path: '/', auth: false, expect: 'What the stranger does' },
  { name: 'signin', path: '/signin', auth: false, expect: 'Continue as guest' },
  { name: 'stranger', path: '/c/demotoken', auth: false, expect: 'How Rosa communicates' },
  { name: 'people', path: '/app', auth: true, expect: 'Sign out' },
  { name: 'person', path: `/person/${PERSON.id}`, auth: true, expect: 'Record a signal' },
  // Not the labelling form: that appears only once a clip exists, and there is
  // no camera here. This is what the route shows on arrival.
  { name: 'record', path: `/person/${PERSON.id}/record`, auth: true, expect: 'Short is better' },
  { name: 'share', path: `/person/${PERSON.id}/share`, auth: true, expect: 'Create a code' },
  { name: 'inbox', path: `/person/${PERSON.id}/inbox`, auth: true, expect: 'Questions about' },
  { name: 'activity', path: `/person/${PERSON.id}/activity`, auth: true, expect: 'opened the lexicon' },
  { name: 'notfound', path: '/no-such-page', auth: false, expect: 'nothing at this address' },
]

const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'desktop', width: 1280, height: 900 },
]

const THEMES = ['light', 'dark']

await mkdir(SHOTS, { recursive: true })

const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ??
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
})

const failures = []
let checked = 0

for (const theme of THEMES) {
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: theme,
      deviceScaleFactor: 1,
      permissions: [],
    })

    for (const route of ROUTES) {
      const page = await context.newPage()
      await installStubs(page)
      await page.addInitScript(
        ([ref, session, authed]) => {
          if (authed) localStorage.setItem(`sb-${ref}-auth-token`, session)
          else localStorage.clear()
        },
        [PROJECT_REF, SESSION, route.auth]
      )

      await page.goto(`${BASE}${route.path}`, { waitUntil: 'networkidle' })
      // Let skeletons resolve and videos attach.
      await page.waitForTimeout(700)

      const result = await page.evaluate(AUDIT)
      checked++

      const label = `${route.name}/${viewport.name}/${theme}`

      const text = await page.evaluate(() => document.body.innerText)
      if (!text.includes(route.expect)) {
        failures.push(
          `${label}: page did not render — expected to find ${JSON.stringify(route.expect)}`
        )
      }

      for (const item of result.unlabelled) {
        failures.push(`${label}: unlabelled control — ${item}`)
      }
      for (const item of result.small) {
        failures.push(`${label}: target under ${MIN_TARGET}px — ${item}`)
      }

      await page.screenshot({
        path: join(SHOTS, `${route.name}-${viewport.name}-${theme}.png`),
        fullPage: true,
      })
      await page.close()
    }

    await context.close()
  }
}

await browser.close()
server.close()

console.log(`\nAudited ${checked} page renders. Screenshots in .ui-audit/\n`)

if (failures.length === 0) {
  console.log('  No unlabelled controls. No targets under 44px.\n')
  process.exit(0)
}

// Group so one recurring component does not look like thirty separate bugs.
const grouped = new Map()
for (const failure of failures) {
  const [where, what] = failure.split(': ')
  if (!grouped.has(what)) grouped.set(what, [])
  grouped.get(what).push(where)
}

console.error(`  ${grouped.size} distinct problem${grouped.size === 1 ? '' : 's'}:\n`)
for (const [what, wheres] of grouped) {
  console.error(`  ${what}`)
  console.error(`      on ${wheres.length} render${wheres.length === 1 ? '' : 's'}, e.g. ${wheres[0]}`)
}
console.error('')
process.exit(1)
