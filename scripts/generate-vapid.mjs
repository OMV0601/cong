/**
 * Generates the VAPID keypair used to sign Web Push messages.
 *
 *   npm run vapid
 *
 * The PUBLIC key is printed — it ships to the browser, that is what it is for.
 *
 * The PRIVATE key is written to .vapid-private.local (git-ignored) and is
 * deliberately never printed. Anything printed ends up in terminal scrollback,
 * CI logs and screen recordings. Read it from the file when you paste it into
 * the Supabase Edge Function secrets, then delete the file.
 */
import webpush from 'web-push'
import { writeFileSync } from 'node:fs'

const { publicKey, privateKey } = webpush.generateVAPIDKeys()

writeFileSync('.vapid-private.local', privateKey + '\n', { mode: 0o600 })

console.log(`
VAPID keypair generated.

  Public key (put in .env.local and in Vercel env vars):

    VITE_VAPID_PUBLIC_KEY=${publicKey}

  Private key: written to .vapid-private.local (git-ignored, not printed).

    Supabase -> Edge Functions -> Secrets:
      VAPID_PRIVATE_KEY   <paste contents of .vapid-private.local>
      VAPID_SUBJECT       mailto:you@example.com

    Then: rm .vapid-private.local
`)
