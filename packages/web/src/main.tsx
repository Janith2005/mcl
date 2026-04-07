import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Force light theme per current product direction.
if (typeof window !== 'undefined') {
  document.documentElement.classList.remove('dark')
  localStorage.setItem('ip-theme', 'light')
}

// Sentry browser error tracking (only if DSN is configured)
const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  import('./lib/sentry').then(({ initSentry }) => {
    initSentry(sentryDsn, import.meta.env.MODE)
  })
}

// PostHog product analytics (only if key is configured)
const posthogKey = import.meta.env.VITE_POSTHOG_KEY
if (posthogKey) {
  import('./lib/analytics').then(({ initAnalytics }) => {
    initAnalytics(posthogKey)
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
