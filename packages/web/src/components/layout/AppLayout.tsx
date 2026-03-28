import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TacticalAssistant } from './TacticalAssistant'

export function AppLayout() {
  const [assistantOpen, setAssistantOpen] = useState(true)

  return (
    <div className="min-h-screen" style={{ background: 'var(--ip-bg-gradient)' }}>
      <Sidebar />
      <main
        className="min-h-screen transition-all duration-300"
        style={{
          marginLeft: 'var(--ip-sidebar-width)',
          marginRight: assistantOpen ? 'var(--ip-assistant-width)' : '0',
          padding: 'var(--ip-space-8) var(--ip-space-10)',
          maxWidth: assistantOpen ? 'var(--ip-content-max)' : undefined,
        }}
      >
        <Outlet />
      </main>
      <TacticalAssistant isOpen={assistantOpen} setIsOpen={setAssistantOpen} />
    </div>
  )
}
