const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function isLocalHost(): boolean {
  if (typeof window === 'undefined') return false
  return LOCAL_HOSTS.has(window.location.hostname)
}

/**
 * Bypass auth in either explicit dev mode or local Vite development.
 * This prevents local frontend/backend env mismatch from causing auth loops.
 */
export function shouldBypassAuth(): boolean {
  return import.meta.env.VITE_DEV_SKIP_AUTH === 'true' || (import.meta.env.DEV && isLocalHost())
}

