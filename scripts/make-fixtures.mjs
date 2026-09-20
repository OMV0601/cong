/**
 * Generates the placeholder clips used by the demo lexicon.
 *
 *   node scripts/make-fixtures.mjs
 *
 * These are ABSTRACT MOTION STUDIES, not footage of anybody. That is the point.
 * A demo lexicon needs clips that loop in a grid and differ from each other at
 * a glance, so the product is legible to someone trying it — but using video of
 * a real non-speaking person to demo a product is not a thing to do casually,
 * and staged footage pretending to be real is worse. Everything here is drawn
 * by a canvas, and the app labels the whole person as demo data on screen.
 *
 * You only need to run this if you are changing the fixtures. The output is
 * committed, so `npm run seed:demo` works on a clean checkout with no browser.
 *
 * Recorded through Chromium rather than encoded with ffmpeg because the clips
 * should be exactly what the app itself produces: VP9 in WebM, out of
 * MediaRecorder, at the size a phone camera would hand us.
 */
import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures')

const SIZE = 288
const FPS = 25
const SECONDS = 2.4
const BITRATE = 220_000

/**
 * Each entry draws one frame given `t`, a 0→1 loop position.
 *
 * They are written to loop seamlessly, because every tile in the grid plays on
 * repeat and a visible seam reads as a glitch.
 */
const CLIPS = [
  {
    slug: 'pain-hum',
    // Tight, fast, high amplitude, with a jagged second harmonic. Reads as
    // distress next to the calmer wave below, which is the only thing these two
    // clips have to communicate.
    draw: 'wave',
    params: { amp: 0.34, freq: 7, speed: 3, jitter: 0.5, weight: 7 },
  },
  {
    slug: 'anxious-hum',
    draw: 'wave',
    params: { amp: 0.16, freq: 4, speed: 1.6, jitter: 0, weight: 5 },
  },
  {
    slug: 'hand-flick',
    draw: 'flick',
    params: {},
  },
  {
    slug: 'rocking',
    draw: 'rock',
    params: {},
  },
  {
    slug: 'jaw-tension',
    draw: 'clench',
    params: {},
  },
  {
    slug: 'legs-drawn-up',
    draw: 'legs',
    params: {},
  },
  {
    slug: 'reaching',
    draw: 'reach',
    params: {},
  },
  {
    slug: 'going-still',
    draw: 'still',
    params: {},
  },
]

const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ??
    '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
})

const page = await browser.newPage()
await page.goto('about:blank')
await mkdir(OUT, { recursive: true })

for (const clip of CLIPS) {
  const { video, poster } = await page.evaluate(
    async ({ clip, SIZE, FPS, SECONDS, BITRATE }) => {
      const BG = '#1b2120'
      const INK = '#6fd4c8'
      const DIM = '#2f3a38'

      const canvas = document.createElement('canvas')
      canvas.width = SIZE
      canvas.height = SIZE
      const ctx = canvas.getContext('2d')

      const painters = {
        wave(t, p) {
          ctx.strokeStyle = INK
          ctx.lineWidth = p.weight
          ctx.lineCap = 'round'
          ctx.beginPath()
          for (let x = 0; x <= SIZE; x += 3) {
            const u = x / SIZE
            // The phase advances by a whole number of cycles over the loop, so
            // the last frame matches the first.
            const phase = 2 * Math.PI * (u * p.freq + t * Math.round(p.speed))
            const envelope = Math.sin(Math.PI * u)
            const jitter = p.jitter
              ? Math.sin(phase * 3.017) * p.jitter * 0.3
              : 0
            const y =
              SIZE / 2 +
              (Math.sin(phase) + jitter) * envelope * p.amp * SIZE
            if (x === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.stroke()
        },

        flick(t) {
          // Still, then a fast flick, then still again — the shape of the
          // gesture matters more than the shape of the hand.
          const burst = t > 0.35 && t < 0.6 ? Math.sin((t - 0.35) / 0.25 * Math.PI) : 0
          ctx.fillStyle = DIM
          ctx.fillRect(SIZE * 0.2, SIZE * 0.62, SIZE * 0.14, SIZE * 0.3)
          ctx.save()
          ctx.translate(SIZE * 0.27, SIZE * 0.62)
          ctx.rotate(-burst * 0.9)
          ctx.fillStyle = INK
          ctx.beginPath()
          ctx.roundRect(-SIZE * 0.05, -SIZE * 0.34, SIZE * 0.1, SIZE * 0.36, SIZE * 0.05)
          ctx.fill()
          ctx.restore()
        },

        rock(t) {
          const sway = Math.sin(2 * Math.PI * t * 2)
          ctx.save()
          ctx.translate(SIZE / 2 + sway * SIZE * 0.13, SIZE * 0.62)
          ctx.rotate(sway * 0.12)
          ctx.fillStyle = INK
          ctx.beginPath()
          ctx.ellipse(0, 0, SIZE * 0.16, SIZE * 0.24, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(0, -SIZE * 0.3, SIZE * 0.1, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        },

        clench(t) {
          const grip = (1 - Math.cos(2 * Math.PI * t)) / 2
          const h = SIZE * (0.16 - grip * 0.07)
          ctx.fillStyle = DIM
          ctx.beginPath()
          ctx.ellipse(SIZE / 2, SIZE / 2, SIZE * 0.3, SIZE * 0.34, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = INK
          ctx.beginPath()
          ctx.roundRect(SIZE * 0.34, SIZE * 0.54 - h / 2, SIZE * 0.32, h, h / 2)
          ctx.fill()
        },

        legs(t) {
          const pull = (1 - Math.cos(2 * Math.PI * t)) / 2
          ctx.fillStyle = DIM
          ctx.beginPath()
          ctx.roundRect(SIZE * 0.3, SIZE * 0.12, SIZE * 0.4, SIZE * 0.3, SIZE * 0.08)
          ctx.fill()
          ctx.fillStyle = INK
          for (const x of [0.36, 0.54]) {
            // The legs stay attached at the hip and shorten as they draw up,
            // so the top is fixed and only the length moves.
            const top = SIZE * 0.42
            const len = SIZE * (0.4 - pull * 0.22)
            ctx.beginPath()
            ctx.roundRect(SIZE * x, top, SIZE * 0.1, len, SIZE * 0.05)
            ctx.fill()
          }
        },

        reach(t) {
          const out = Math.sin(Math.PI * Math.min(1, t * 1.6)) * (t < 0.62 ? 1 : 0)
          ctx.fillStyle = DIM
          ctx.beginPath()
          ctx.arc(SIZE * 0.82, SIZE * 0.5, SIZE * 0.09, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = INK
          ctx.beginPath()
          ctx.roundRect(
            SIZE * 0.12,
            SIZE * 0.45,
            SIZE * (0.16 + out * 0.5),
            SIZE * 0.1,
            SIZE * 0.05
          )
          ctx.fill()
        },

        still(t) {
          // Movement that decays to nothing and stays there. The absence is the
          // signal, which is exactly the kind of thing a stranger misreads.
          const decay = Math.max(0, 1 - t * 2.6)
          const sway = Math.sin(2 * Math.PI * t * 5) * decay
          ctx.fillStyle = decay > 0.02 ? INK : DIM
          ctx.save()
          ctx.translate(SIZE / 2 + sway * SIZE * 0.1, SIZE * 0.55)
          ctx.beginPath()
          ctx.ellipse(0, 0, SIZE * 0.17, SIZE * 0.25, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.beginPath()
          ctx.arc(0, -SIZE * 0.31, SIZE * 0.1, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        },
      }

      const paint = (t) => {
        ctx.fillStyle = BG
        ctx.fillRect(0, 0, SIZE, SIZE)
        painters[clip.draw](t, clip.params)
      }

      const stream = canvas.captureStream(FPS)
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: BITRATE,
      })
      const chunks = []
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      const stopped = new Promise((resolve) => (recorder.onstop = resolve))

      const total = Math.round(FPS * SECONDS)
      paint(0)
      recorder.start()
      for (let frame = 0; frame < total; frame++) {
        paint(frame / total)
        await new Promise((r) => setTimeout(r, 1000 / FPS))
      }
      recorder.stop()
      await stopped

      // A frame from partway in, for the same reason the app does it: frame
      // zero of a motion study is usually the least informative one.
      paint(0.45)
      const poster = canvas.toDataURL('image/jpeg', 0.72).split(',')[1]

      const blob = new Blob(chunks, { type: 'video/webm' })
      const buf = new Uint8Array(await blob.arrayBuffer())
      let binary = ''
      for (const byte of buf) binary += String.fromCharCode(byte)
      return { video: btoa(binary), poster }
    },
    { clip, SIZE, FPS, SECONDS, BITRATE }
  )

  const videoBuf = Buffer.from(video, 'base64')
  const posterBuf = Buffer.from(poster, 'base64')
  await writeFile(join(OUT, `${clip.slug}.webm`), videoBuf)
  await writeFile(join(OUT, `${clip.slug}.jpg`), posterBuf)
  console.log(
    `${clip.slug.padEnd(16)} ${String(Math.round(videoBuf.length / 1024)).padStart(4)} KB video  ${String(Math.round(posterBuf.length / 1024)).padStart(3)} KB poster`
  )
}

await browser.close()
console.log(`\nWrote ${CLIPS.length} clips to fixtures/`)
