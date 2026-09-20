import { describe, expect, it } from 'vitest'
import { baseMimeType, extensionFor, pickMimeType } from './recorder'

describe('pickMimeType', () => {
  it('prefers vp9 when the browser supports everything', () => {
    expect(pickMimeType(() => true)).toBe('video/webm;codecs=vp9,opus')
  })

  it('falls back to vp8 when vp9 is unavailable', () => {
    const supported = (t: string) => !t.includes('vp9')
    expect(pickMimeType(supported)).toBe('video/webm;codecs=vp8,opus')
  })

  it('picks mp4 on a Safari-like browser that rejects webm entirely', () => {
    // This is the case that actually bites: a parent records on an iPhone and
    // the clip has to play back on an ER tablet.
    const safari = (t: string) => t.startsWith('video/mp4')
    expect(pickMimeType(safari)).toBe('video/mp4;codecs=h264,aac')
  })

  it('returns null when nothing is supported, rather than guessing', () => {
    expect(pickMimeType(() => false)).toBeNull()
  })
})

describe('baseMimeType', () => {
  it('strips codec parameters', () => {
    expect(baseMimeType('video/webm;codecs=vp9,opus')).toBe('video/webm')
    expect(baseMimeType('video/mp4;codecs=h264,aac')).toBe('video/mp4')
  })

  it('leaves a bare type alone', () => {
    expect(baseMimeType('video/webm')).toBe('video/webm')
  })

  it('tolerates whitespace', () => {
    expect(baseMimeType('video/mp4 ;codecs=h264')).toBe('video/mp4')
  })
})

describe('extensionFor', () => {
  it('maps mp4 recordings to .mp4', () => {
    expect(extensionFor('video/mp4;codecs=h264,aac')).toBe('mp4')
  })

  it('maps everything else to .webm', () => {
    expect(extensionFor('video/webm;codecs=vp9,opus')).toBe('webm')
    expect(extensionFor('video/webm')).toBe('webm')
  })
})
