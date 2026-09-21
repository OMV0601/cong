import painHum from '../../fixtures/pain-hum.webm'
import painHumPoster from '../../fixtures/pain-hum.jpg'
import anxiousHum from '../../fixtures/anxious-hum.webm'
import anxiousHumPoster from '../../fixtures/anxious-hum.jpg'
import legsDrawnUp from '../../fixtures/legs-drawn-up.webm'
import legsDrawnUpPoster from '../../fixtures/legs-drawn-up.jpg'
import jawTension from '../../fixtures/jaw-tension.webm'
import jawTensionPoster from '../../fixtures/jaw-tension.jpg'
import rocking from '../../fixtures/rocking.webm'
import rockingPoster from '../../fixtures/rocking.jpg'
import handFlick from '../../fixtures/hand-flick.webm'
import handFlickPoster from '../../fixtures/hand-flick.jpg'

export interface DemoClip {
  slug: string
  label: string
  meaning: string
  region: string
  urgency: 'routine' | 'attention' | 'urgent'
  isSound: boolean
  src: string
  poster: string
}

/**
 * The clips the landing page shows.
 *
 * Imported from fixtures/ rather than copied into public/, so there is exactly
 * one set of demo clips in the repo and Vite fingerprints them like any other
 * asset. Same files the seeding script uploads, so the page and the live demo
 * tell the same story with the same footage.
 *
 * They are abstract animations, and the page says so directly underneath them.
 * Showing a stranger's-eye view of a real non-speaking person's medical
 * vocabulary to sell the idea would be a strange way to demonstrate a product
 * about not misrepresenting people.
 */
export const DEMO_CLIPS: DemoClip[] = [
  {
    slug: 'pain-hum',
    label: 'Pain hum',
    meaning:
      'Low, rising, and it does not stop when you talk to her. Check ears and stomach first.',
    region: 'Whole body',
    urgency: 'urgent',
    isSound: true,
    src: painHum,
    poster: painHumPoster,
  },
  {
    slug: 'anxious-hum',
    label: 'Anxious hum',
    meaning:
      'Flatter and quieter, and it stops if you lower your voice or dim the lights. Overwhelmed, not hurting.',
    region: 'Whole body',
    urgency: 'attention',
    isSound: true,
    src: anxiousHum,
    poster: anxiousHumPoster,
  },
  {
    slug: 'legs-drawn-up',
    label: 'Drawing her legs up',
    meaning: 'Both knees to her chest and held there. Stomach pain, almost always.',
    region: 'Legs or feet',
    urgency: 'urgent',
    isSound: false,
    src: legsDrawnUp,
    poster: legsDrawnUpPoster,
  },
  {
    slug: 'jaw-tension',
    label: 'Jaw set',
    meaning:
      'Jaw clenched, lips pulled thin. She is bracing — usually she has worked out a procedure is coming.',
    region: 'Face or head',
    urgency: 'attention',
    isSound: false,
    src: jawTension,
    poster: jawTensionPoster,
  },
  {
    slug: 'rocking',
    label: 'Rocking',
    meaning: 'Steady and even. Self-soothing, and it is fine. Do not try to stop it.',
    region: 'Whole body',
    urgency: 'routine',
    isSound: false,
    src: rocking,
    poster: rockingPoster,
  },
  {
    slug: 'hand-flick',
    label: 'Hand flick',
    meaning:
      'A quick flick at the wrist. She is pleased, or she understood you. The closest thing she has to a yes.',
    region: 'Hands or arms',
    urgency: 'routine',
    isSound: false,
    src: handFlick,
    poster: handFlickPoster,
  },
]

export const clipBySlug = (slug: string): DemoClip =>
  DEMO_CLIPS.find((c) => c.slug === slug) ?? DEMO_CLIPS[0]
