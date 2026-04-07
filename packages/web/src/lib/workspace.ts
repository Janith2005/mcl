import { shouldBypassAuth } from '@/lib/runtime'

const KEY = 'mcl_workspace_id'
const DEV_SKIP_AUTH = shouldBypassAuth()

function normalizeWorkspacePath(path: string): string {
  if (!path) return ''
  return path.startsWith('/') ? path : `/${path}`
}

export function getWorkspaceId(): string {
  const envWorkspaceId = (import.meta.env.VITE_WORKSPACE_ID || '').trim()
  const storedWorkspaceId = (localStorage.getItem(KEY) || '').trim()

  // In dev mode, prefer the configured workspace ID to avoid stale IDs from old sessions.
  if (DEV_SKIP_AUTH && envWorkspaceId) {
    if (storedWorkspaceId !== envWorkspaceId) {
      localStorage.setItem(KEY, envWorkspaceId)
    }
    return envWorkspaceId
  }

  return storedWorkspaceId || envWorkspaceId
}

export function setWorkspaceId(id: string): void {
  const value = id.trim()
  if (!value) return
  localStorage.setItem(KEY, value)
}

export function clearWorkspaceId(): void {
  localStorage.removeItem(KEY)
}

/** Returns the workspace-scoped URL prefix, e.g. /api/v1/workspaces/abc123 */
export function wsPath(path: string = ''): string {
  const suffix = normalizeWorkspacePath(path)
  const id = getWorkspaceId()
  if (!id) return `/api/v1/workspaces${suffix}`
  return `/api/v1/workspaces/${id}${suffix}`
}
