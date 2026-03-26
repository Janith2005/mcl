import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

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
