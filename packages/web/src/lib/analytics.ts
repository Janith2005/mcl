/**
 * PostHog analytics - event tracking, user identification, and pre-defined helpers.
 */
import posthog from 'posthog-js'

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

export function initAnalytics(apiKey: string): void {
  posthog.init(apiKey, {
    api_host: 'https://us.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
  })
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

export function trackEvent(
  name: string,
  properties?: Record<string, unknown>,
): void {
  posthog.capture(name, properties)
}

export function identifyUser(
  userId: string,
  traits?: Record<string, unknown>,
): void {
  posthog.identify(userId, traits)
}

export function resetUser(): void {
  posthog.reset()
}

// ---------------------------------------------------------------------------
// Pre-defined event helpers (keep names aligned with the PRD event catalogue)
// ---------------------------------------------------------------------------

export function trackWorkspaceCreated(workspaceId: string): void {
  trackEvent('workspace_created', { workspace_id: workspaceId })
}

export function trackBrainOnboarded(workspaceId: string): void {
  trackEvent('brain_onboarded', { workspace_id: workspaceId })
}

export function trackDiscoveryRun(
  workspaceId: string,
  mode: 'competitors' | 'keywords' | 'both',
): void {
  trackEvent('discovery_run', { workspace_id: workspaceId, mode })
}

export function trackAngleCreated(workspaceId: string, angleId: string): void {
  trackEvent('angle_created', { workspace_id: workspaceId, angle_id: angleId })
}

export function trackScriptCreated(
  workspaceId: string,
  scriptId: string,
): void {
  trackEvent('script_created', {
    workspace_id: workspaceId,
    script_id: scriptId,
  })
}

export function trackAnalyticsRun(workspaceId: string): void {
  trackEvent('analytics_run', { workspace_id: workspaceId })
}

export function trackPdfDownloaded(
  workspaceId: string,
  reportType: string,
): void {
  trackEvent('pdf_downloaded', {
    workspace_id: workspaceId,
    report_type: reportType,
  })
}
