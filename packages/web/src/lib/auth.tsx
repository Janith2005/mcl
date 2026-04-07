/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/api/supabase'
import { setWorkspaceId, getWorkspaceId } from '@/lib/workspace'
import { api } from '@/api/client'
import { shouldBypassAuth } from '@/lib/runtime'

const DEV_SKIP_AUTH = shouldBypassAuth()

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']
type User = NonNullable<Session>['user']

type WorkspaceListItem = {
  id?: string
  workspaces?: {
    id?: string
  }
}

type DevSetupResponse = {
  workspace_id?: string
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  hasWorkspace: boolean
  refreshWorkspace: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  hasWorkspace: false,
  refreshWorkspace: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

function extractWorkspaceId(item?: WorkspaceListItem): string {
  const id = item?.workspaces?.id ?? item?.id
  return typeof id === 'string' ? id.trim() : ''
}

async function workspaceExists(workspaceId: string): Promise<boolean> {
  const id = workspaceId.trim()
  if (!id) return false

  try {
    await api(`/api/v1/workspaces/${id}`)
    return true
  } catch {
    return false
  }
}

async function pickFirstWorkspace(): Promise<boolean> {
  try {
    const data = await api<WorkspaceListItem[]>('/api/v1/workspaces')
    const workspaces = Array.isArray(data) ? data : []

    for (const ws of workspaces) {
      const id = extractWorkspaceId(ws)
      if (id) {
        setWorkspaceId(id)
        return true
      }
    }
  } catch {
    // Non-fatal: user may be offline or workspace not created yet.
  }

  return false
}

async function bootstrapWorkspace(): Promise<boolean> {
  const currentWorkspaceId = getWorkspaceId().trim()
  if (currentWorkspaceId && await workspaceExists(currentWorkspaceId)) {
    return true
  }

  return pickFirstWorkspace()
}

async function bootstrapDevWorkspace(): Promise<boolean> {
  try {
    const data = await api<DevSetupResponse>('/api/v1/dev/setup', { method: 'POST' })
    const workspaceId = typeof data?.workspace_id === 'string' ? data.workspace_id.trim() : ''
    if (workspaceId) {
      setWorkspaceId(workspaceId)
      return true
    }
  } catch {
    // Non-fatal: still attempt workspace discovery below.
  }

  return bootstrapWorkspace()
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasWorkspace, setHasWorkspace] = useState(false)

  async function refreshWorkspace() {
    const found = DEV_SKIP_AUTH ? await bootstrapDevWorkspace() : await bootstrapWorkspace()
    setHasWorkspace(found)
  }

  useEffect(() => {
    // Dev mode: skip Supabase user auth but still ensure a valid workspace.
    if (DEV_SKIP_AUTH) {
      bootstrapDevWorkspace()
        .then((found) => setHasWorkspace(found))
        .finally(() => setLoading(false))
      return
    }

    let done = false

    const finish = async (s: Session | null) => {
      if (done) return
      done = true
      setSession(s)

      if (s) {
        const found = await bootstrapWorkspace()
        setHasWorkspace(found)

        if (import.meta.env.VITE_POSTHOG_KEY) {
          import('./analytics').then(({ identifyUser }) => {
            identifyUser(s.user.id, { email: s.user.email })
          })
        }
      } else {
        setHasWorkspace(false)
      }

      setLoading(false)
    }

    // Safety timeout: stop blocking the UI if Supabase hangs.
    const timer = setTimeout(() => {
      if (!done) {
        void finish(null)
      }
    }, 4000)

    supabase.auth.getSession()
      .then(({ data }) => finish(data.session))
      .catch(() => finish(null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)

      if (s) {
        const found = await bootstrapWorkspace()
        setHasWorkspace(found)

        if (import.meta.env.VITE_POSTHOG_KEY) {
          import('./analytics').then(({ identifyUser }) => {
            identifyUser(s.user.id, { email: s.user.email })
          })
        }
      } else {
        setHasWorkspace(false)

        if (import.meta.env.VITE_POSTHOG_KEY) {
          import('./analytics').then(({ resetUser }) => resetUser())
        }
      }

      setLoading(false)
    })

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, hasWorkspace, refreshWorkspace }}>
      {children}
    </AuthContext.Provider>
  )
}
