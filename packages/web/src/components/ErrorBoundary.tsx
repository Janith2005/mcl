import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--ip-bg)',
          flexDirection: 'column',
          gap: '16px',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px' }}>⚡</div>
        <h1 style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)', fontSize: '24px', fontWeight: 700 }}>
          Something went wrong
        </h1>
        <p style={{ color: 'var(--ip-text-secondary)', fontSize: '14px', maxWidth: '400px' }}>
          {this.state.error?.message || 'An unexpected error occurred.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: 'var(--ip-primary-gradient)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--ip-radius-full)',
            padding: '10px 24px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reload Page
        </button>
      </div>
    )
  }
}
