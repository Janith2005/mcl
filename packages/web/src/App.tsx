import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
import { Legal } from './pages/Legal'
import { FeedbackWidget } from './components/FeedbackWidget'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/legal" element={<Legal />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/angles" element={<Angles />} />
            <Route path="/hooks" element={<Hooks />} />
            <Route path="/scripts" element={<Scripts />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/brain" element={<BrainPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <FeedbackWidget />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
