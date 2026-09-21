import { useEffect, useState } from 'react'

/**
 * Whether this person has asked their system to reduce motion.
 *
 * The landing page leans on looping video, which is the right way to show a
 * product made of looping video — but for someone with vestibular sensitivity a
 * page of autoplaying clips is genuinely unpleasant, and an accessibility
 * product that ignores the accessibility setting aimed straight at it would be
 * hard to defend.
 *
 * Note this deliberately does NOT get applied to the signal grid inside the
 * app. There, the looping IS the interaction — Layer 1 is "look until one
 * matches" — and freezing it would remove the feature rather than soften it.
 * On the landing page the motion is presentational, so it yields.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  )

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return reduced
}
