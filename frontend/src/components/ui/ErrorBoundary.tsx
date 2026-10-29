import React from 'react'

interface State { hasError: boolean; message: string }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center px-4 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-500 mb-4">{this.state.message}</p>
          <button onClick={() => this.setState({ hasError: false, message: '' })} className="btn-secondary">
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
