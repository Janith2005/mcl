const KEY = 'mcl_workspace_id'

export function getWorkspaceId(): string {
  return (
    localStorage.getItem(KEY) ||
    import.meta.env.VITE_WORKSPACE_ID ||
    ''
  )
}

export function setWorkspaceId(id: string): void {
  localStorage.setItem(KEY, id)
}

export function clearWorkspaceId(): void {
  localStorage.removeItem(KEY)
}

/** Returns the workspace-scoped URL prefix, e.g. /api/v1/workspaces/abc123 */
export function wsPath(path: string = ''): string {
  const id = getWorkspaceId()
  if (!id) return `/api/v1/workspaces${path}`
  return `/api/v1/workspaces/${id}${path}`
}
