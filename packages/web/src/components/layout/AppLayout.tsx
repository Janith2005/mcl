import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TacticalAssistant } from './TacticalAssistant'

export function AppLayout() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--ip-bg-gradient)' }}>
      <Sidebar />
      <main
        className="min-h-screen transition-all"
        style={{
          marginLeft: 'var(--ip-sidebar-width)',
          marginRight: 'var(--ip-assistant-width)',
          padding: 'var(--ip-space-8) var(--ip-space-10)',
          maxWidth: 'var(--ip-content-max)',
        }}
      >
        <Outlet />
      </main>
      <TacticalAssistant />
    </div>
  )
}
