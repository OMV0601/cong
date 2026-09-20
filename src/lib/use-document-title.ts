import { useEffect } from 'react'

/**
 * Sets the tab title for a route.
 *
 * Worth doing for one specific reason: a parent who has this open alongside a
 * hospital portal and their email needs to find the right tab in one glance,
 * and every tab currently says "Lexicon". The Ask count in the title is the
 * cheapest possible version of "something needs you".
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
