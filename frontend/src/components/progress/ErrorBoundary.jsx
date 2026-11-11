import { Component } from 'react'

// Shows the real error on the page instead of a black screen, and keeps the sidebar usable.
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) { return { error } }

  componentDidCatch(error, info) { console.error('Progress page crashed:', error, info?.componentStack) }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    return (
      <div role="alert" className="mt-10 rounded-2xl border border-red-500/40 bg-red-500/5 p-5 text-sm">
        <p className="font-semibold text-red-400">Something went wrong while showing your progress.</p>
        <p className="mt-1 text-white/60">Send this message to fix it:</p>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-black/50 p-3 text-xs text-white/80">{String(error?.message ?? error)}</pre>
        <button type="button" onClick={() => this.setState({ error: null })}
          className="mt-4 rounded-full border border-gold/60 px-4 py-2 text-xs font-semibold text-gold transition hover:bg-gold/10">Try again</button>
      </div>
    )
  }
}
