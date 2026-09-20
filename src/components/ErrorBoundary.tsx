import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertCircle, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  /** Named in the console log so a crash report says which screen died. */
  area?: string
}

interface State {
  crashed: boolean
}

/**
 * The last line of defence against a white screen.
 *
 * This matters most on /c/:token. A nurse holding a code has no account, no
 * app, and no reason to try again — if the page renders nothing, Lexicon has
 * failed at the one moment it exists for, and it has failed silently. A calm
 * message and a reload button is not much, but it is the difference between
 * "it's broken, phone the mother" and no information at all.
 *
 * The stack trace goes to the console, never to the screen. A stack trace in
 * front of a stranger is noise at best; at worst it leaks path and id detail
 * about someone else's child.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false }

  static getDerivedStateFromError(): State {
    return { crashed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Lexicon crashed${this.props.area ? ` in ${this.props.area}` : ''}`, error, info)
  }

  render() {
    if (!this.state.crashed) return this.props.children

    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-12">
        <AlertCircle className="size-8 text-urgent" aria-hidden />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Something broke
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          This screen stopped working. Nothing you did caused it, and nothing
          has been lost. Reloading usually fixes it.
        </p>
        <Button
          size="lg"
          className="mt-6"
          onClick={() => window.location.reload()}
        >
          <RotateCw aria-hidden /> Reload
        </Button>
        <p className="mt-4 text-xs text-fg-muted">
          If you are holding a code and need an answer now, contact the family
          directly. Do not wait on this.
        </p>
      </main>
    )
  }
}
