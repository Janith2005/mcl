import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/api/supabase'
import { setWorkspaceId, getWorkspaceId } from '@/lib/workspace'
import { api } from '@/api/client'

const DEV_SKIP_AUTH = import.meta.env.VITE_DEV_SKIP_AUTH === 'true'

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']
type User = NonNullable<Session>['user']

interface AuthContextValue {
  session: Session | null
  user: User | null
  loading: boolean
  hasWorkspace: boolean
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  hasWorkspace: false,
})

export function useAuth() {
  return useContext(AuthContext)
}

async function bootstrapWorkspace(): Promise<boolean> {
  if (getWorkspaceId()) return true
  try {
    const data = await api<any[]>('/api/v1/workspaces')
    const workspaces = Array.isArray(data) ? data : []
    if (workspaces.length > 0) {
      const ws = workspaces[0]
      const id: string = ws?.workspaces?.id ?? ws?.id
      if (id) { setWorkspaceId(id); return true }
    }
  } catch {
    // Non-fatal — user may be offline or workspace not created yet
  }
  return false
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasWorkspace, setHasWorkspace] = useState(false)

  useEffect(() => {
    // Dev mode: skip Supabase entirely
    if (DEV_SKIP_AUTH) {
      // If workspace ID already cached in localStorage, skip the setup call entirely
      if (getWorkspaceId()) {
        setHasWorkspace(true)
        setLoading(false)
        return
      }
      // First run: call dev setup to create workspace in DB
      api('/api/v1/dev/setup', { method: 'POST' })
        .then((data: any) => {
          if (data?.workspace_id) setWorkspaceId(data.workspace_id)
        })
        .catch(() => {
          // Setup failed — wsPath() will fall back to VITE_WORKSPACE_ID
        })
        .finally(() => {
          setHasWorkspace(true)
          setLoading(false)
        })
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
      }
      setLoading(false)
    }

    // Safety timeout — stop blocking the UI if Supabase hangs
    const timer = setTimeout(() => {
      if (!done) finish(null)
    }, 4000)

    supabase.auth.getSession()
      .then(({ data }) => finish(data.session))
      .catch(() => finish(null))

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      setSession(s)
      if (s) {
        const found = await bootstrapWorkspace()
        setHasWorkspace(found)
      } else {
        setHasWorkspace(false)
      }
      setLoading(false)
    })

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, hasWorkspace }}>
      {children}
    </AuthContext.Provider>
  )
}
