import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface State {
  error: Error | null
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Ошибка во вкладке:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="m-6 rounded-xl border border-amber/40 bg-amber/10 p-4 text-sm text-amber">
          <div className="font-semibold">Ошибка во вкладке</div>
          <div className="mt-2 select-text break-all font-mono text-xs">
            {this.state.error.message}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}