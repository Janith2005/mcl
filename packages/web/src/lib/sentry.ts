/**
 * Sentry browser error tracking and performance monitoring.
 */
import * as Sentry from '@sentry/react'

export function initSentry(dsn: string, environment: string): void {
  Sentry.init({
    dsn,
    environment,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: environment === 'development' ? 1.0 : 0.2,
    profilesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  })
}
