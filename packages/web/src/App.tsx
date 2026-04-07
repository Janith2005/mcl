import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/lib/auth'
import { AppLayout } from './components/layout/AppLayout'
import { Login } from './pages/Login'
import { Onboarding } from './pages/Onboarding'
import { Dashboard } from './pages/Dashboard'
import { Topics } from './pages/Topics'
import { Angles } from './pages/Angles'
import { Hooks } from './pages/Hooks'
import { Scripts } from './pages/Scripts'
import { Analytics } from './pages/Analytics'
import { BrainPage } from './pages/Brain'
import { SettingsPage } from './pages/Settings'
import { Support } from './pages/Support'
import { Legal } from './pages/Legal'
import { FeedbackWidget } from './components/FeedbackWidget'
import { ErrorBoundary } from './components/ErrorBoundary'
import { shouldBypassAuth } from '@/lib/runtime'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function Spinner() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--ip-bg)' }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--ip-border)', borderTopColor: 'var(--ip-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

const DEV_SKIP_AUTH = shouldBypassAuth()

function RequireAuth() {
  const { session, loading, hasWorkspace } = useAuth()
  if (loading) return <Spinner />
  if (DEV_SKIP_AUTH) {
    if (!hasWorkspace) return <Navigate to="/onboarding" replace />
    return <Outlet />
  }
  if (!session) return <Navigate to="/login" replace />
  if (!hasWorkspace) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/legal" element={<Legal />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/angles" element={<Angles />} />
          <Route path="/hooks" element={<Hooks />} />
          <Route path="/scripts" element={<Scripts />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/brain" element={<BrainPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/support" element={<Support />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <FeedbackWidget />
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: 'var(--ip-surface)',
                border: '1px solid var(--ip-border-subtle)',
                color: 'var(--ip-text)',
                fontFamily: 'var(--ip-font-body)',
                fontSize: '13px',
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
    </ErrorBoundary>
  )
}
