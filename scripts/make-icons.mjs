/**
 * Renders the PWA icons and the link-preview image.
 *
 *   node scripts/make-icons.mjs
 *
 * Output is committed, so this only needs running when the artwork changes.
 *
 * Two things need raster art that public/icon.svg cannot supply:
 *
 * 1. Android will not offer "Add to Home Screen" without PNG icons at 192 and
 *    512. That matters beyond tidiness — on iOS, Web Push only works at all
 *    once the app has been added to the Home Screen, so the install path is
 *    part of the notification feature rather than decoration.
 *
 * 2. A link with no og:image renders as a bare grey card. The URL for this gets
 *    pasted into a submission form and a group chat, and a grey card is a worse
 *    first impression than the page itself deserves.
 *
 * Drawn on a canvas in Chromium rather than shelling out to a converter, for
 * the same reason as the clip fixtures: no extra binary to install, and the
 * output is deterministic.
 */
import { chromium } from 'playwright'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

const TEAL = '#0f5c56'
const CREAM = '#fbfaf9'
const INK = '#1a1d1c'
const MUTED = '#565d5b'

const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ??
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
})
const page = await browser.newPage()
await page.goto('about:blank')

/** The mark: four stacked bars narrowing to one, matching public/icon.svg. */
async function icon(size, { maskable }) {
  const dataUrl = await page.evaluate(
    ({ size, maskable, TEAL }) => {
      const c = document.createElement('canvas')
      c.width = size
      c.height = size
      const ctx = c.getContext('2d')

      // A maskable icon is cropped to whatever shape the launcher wants, so the
      // mark has to sit inside the safe zone — the middle 80% — and the
      // background has to run to the edges.
      const inset = maskable ? size * 0.1 : 0
      const box = size - inset * 2

      ctx.fillStyle = TEAL
      if (maskable) {
        ctx.fillRect(0, 0, size, size)
      } else {
        const r = size * 0.22
        ctx.beginPath()
        ctx.roundRect(0, 0, size, size, r)
        ctx.fill()
      }

      const bars = [
        { w: 0.5625, o: 1 },
        { w: 0.4375, o: 0.8 },
        { w: 0.3125, o: 0.6 },
      ]
      const h = box * 0.094
      const x = inset + box * 0.219
      bars.forEach((bar, i) => {
        ctx.globalAlpha = bar.o
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.roundRect(x, inset + box * (0.25 + i * 0.1875), box * bar.w, h, h / 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1

      return c.toDataURL('image/png').split(',')[1]
    },
    { size, maskable, TEAL }
  )
  return Buffer.from(dataUrl, 'base64')
}

for (const [name, size, maskable] of [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, false],
]) {
  await writeFile(join(PUBLIC, name), await icon(size, { maskable }))
  console.log(`${name.padEnd(24)} ${size}x${size}`)
}

// --- link preview -----------------------------------------------------------

const og = await page.evaluate(
  ({ TEAL, CREAM, INK, MUTED }) => {
    const W = 1200
    const H = 630
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const ctx = c.getContext('2d')

    ctx.fillStyle = CREAM
    ctx.fillRect(0, 0, W, H)

    // The mark, top left.
    const m = 72
    ctx.fillStyle = TEAL
    ctx.beginPath()
    ctx.roundRect(m, m, 76, 76, 17)
    ctx.fill()
    const bars = [
      { w: 42, o: 1 },
      { w: 33, o: 0.8 },
      { w: 23, o: 0.6 },
    ]
    bars.forEach((bar, i) => {
      ctx.globalAlpha = bar.o
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(m + 17, m + 19 + i * 14, bar.w, 7, 3.5)
      ctx.fill()
    })
    ctx.globalAlpha = 1

    ctx.fillStyle = INK
    ctx.font = '600 40px Inter, system-ui, sans-serif'
    ctx.fillText('Lexicon', m + 96, m + 52)

    // The line the whole project rests on, set large.
    ctx.fillStyle = INK
    ctx.font = '600 62px Inter, system-ui, sans-serif'
    const lines = [
      'Every non-speaking person',
      'has a vocabulary. It just lives',
      'in one person’s head.',
    ]
    lines.forEach((line, i) => ctx.fillText(line, m, 268 + i * 78))

    ctx.fillStyle = MUTED
    ctx.font = '400 30px Inter, system-ui, sans-serif'
    ctx.fillText(
      'Lexicon makes it readable by someone who has never met them.',
      m,
      H - 96
    )

    ctx.fillStyle = TEAL
    ctx.fillRect(m, H - 64, 120, 5)

    return c.toDataURL('image/png').split(',')[1]
  },
  { TEAL, CREAM, INK, MUTED }
)

await writeFile(join(PUBLIC, 'og.png'), Buffer.from(og, 'base64'))
console.log(`${'og.png'.padEnd(24)} 1200x630`)

await browser.close()
