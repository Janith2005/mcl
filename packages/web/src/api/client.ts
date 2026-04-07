import { supabase } from './supabase'
import { shouldBypassAuth } from '@/lib/runtime'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const DEV_SKIP_AUTH = shouldBypassAuth()

// Cache the token in memory — avoids a Supabase round-trip on every request
let _cachedToken: string | null = null

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (DEV_SKIP_AUTH) return {}
  if (_cachedToken) return { Authorization: `Bearer ${_cachedToken}` }
  const { data } = await supabase.auth.getSession()
  _cachedToken = data.session?.access_token ?? null
  if (!_cachedToken) return {}
  return { Authorization: `Bearer ${_cachedToken}` }
}

// Clear token cache on sign-out so next request fetches fresh
supabase.auth.onAuthStateChange((_event, session) => {
  _cachedToken = session?.access_token ?? null
})

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(await getAuthHeaders()),
    ...options.headers,
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail || res.statusText)
  }

  return res.json()
}

export const apiGet = <T = unknown>(path: string) => api<T>(path)
export const apiPost = <T = unknown>(path: string, body: unknown) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) })
export const apiPut = <T = unknown>(path: string, body: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body) })
export const apiPatch = <T = unknown>(path: string, body: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
export const apiDelete = <T = unknown>(path: string) =>
  api<T>(path, { method: 'DELETE' })
