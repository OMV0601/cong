import { describe, expect, it } from 'vitest'
import { urlBase64ToUint8Array } from './push'

/**
 * The base64url → Uint8Array conversion is the single most common reason Web
 * Push silently never arrives, so it gets tested against the shape of a real
 * VAPID key rather than a made-up string.
 *
 * A VAPID public key is an uncompressed P-256 point: the byte 0x04 followed by
 * a 32-byte X and a 32-byte Y, so 65 bytes exactly. If the padding, the `-`,
 * or the `_` is handled wrong, the length comes out wrong or atob() throws —
 * either way this catches it, which is more than the browser will do.
 */
const REAL_VAPID_PUBLIC_KEY =
  'BJtFm41uCnQCvSwqW22QmbSND9pBLRDJ39v0ysMrgWXDtXfoRIEBbZrUeACSURLeuMg5-eZqqkBif8k-9HDDkWg'

describe('urlBase64ToUint8Array', () => {
  it('decodes a real VAPID public key to a 65-byte P-256 point', () => {
    const bytes = urlBase64ToUint8Array(REAL_VAPID_PUBLIC_KEY)
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes).toHaveLength(65)
    // 0x04 is the uncompressed-point marker. Anything else means we decoded
    // something that is not a public key.
    expect(bytes[0]).toBe(0x04)
  })

  it('restores the padding that base64url strips', () => {
    // 'aGk' is 'hi' with its single '=' removed. Unpadded input is the normal
    // case for VAPID keys, and atob() rejects it outright.
    expect(Array.from(urlBase64ToUint8Array('aGk'))).toEqual([0x68, 0x69])
  })

  it('translates - and _ back to + and /', () => {
    // 0xFB 0xFF decodes from '+/8=' in standard base64 and '-_8' in base64url.
    // Skipping this translation is the failure that subscribes successfully
    // against a key the server cannot sign for.
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([0xfb, 0xff])
    expect(Array.from(urlBase64ToUint8Array('+/8='))).toEqual([0xfb, 0xff])
  })

  it('round-trips every byte value without corruption', () => {
    const original = Uint8Array.from({ length: 256 }, (_, i) => i)
    const base64url = btoa(String.fromCharCode(...original))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    expect(Array.from(urlBase64ToUint8Array(base64url))).toEqual(
      Array.from(original)
    )
  })

  it('handles an empty string without throwing', () => {
    expect(urlBase64ToUint8Array('')).toHaveLength(0)
  })
})
