import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

/**
 * Catches a render error and shows it, instead of letting React unmount the
 * whole tree and leave a blank page — which is what one unguarded field on one
 * card used to do to this app. A blank page tells the user nothing and looks
 * like the app is still loading; this at least says what broke and offers a way
 * out without a hard refresh.
 *
 * It only catches errors thrown while rendering. Errors from a fetch are the
 * query's business and belong on the card that made the request.
 */
interface Props {
  children: ReactNode
  /** Shown above the message, e.g. the page name. */
  title: string
  retryLabel: string
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep it in the console: the message below is deliberately short, and the
    // component stack is what actually locates the bad render.
    console.error('Render failed:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <div className="max-w-md rounded-xl border border-danger/30 bg-danger/5 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 size-8 text-danger" />
          <p className="font-medium text-fg">{this.props.title}</p>
          <p className="mt-1 break-words text-sm text-muted">{error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-500 px-3 text-sm font-semibold text-navy-900 transition-colors hover:bg-brand-400"
          >
            <RefreshCw className="size-4" /> {this.props.retryLabel}
          </button>
        </div>
      </div>
    )
  }
}
