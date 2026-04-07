import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TacticalAssistant } from './TacticalAssistant'

export function AppLayout() {
  const [assistantOpen, setAssistantOpen] = useState(false)

  return (
    <div className="min-h-screen relative overflow-x-clip" style={{ background: 'var(--ip-bg-gradient)' }}>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in srgb, var(--ip-border-subtle) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--ip-border-subtle) 55%, transparent) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          opacity: 0.17,
        }}
      />

      <Sidebar />

      <main
        className="relative z-10 min-h-screen transition-all duration-300"
        style={{
          paddingTop: 96,
          paddingLeft: 'var(--ip-space-6)',
          paddingRight: assistantOpen ? 'calc(var(--ip-assistant-width) + var(--ip-space-6))' : 'var(--ip-space-6)',
          paddingBottom: 'var(--ip-space-8)',
        }}
      >
        <div style={{ maxWidth: 'var(--ip-content-max)', margin: '0 auto' }}>
          <Outlet />
        </div>
      </main>

      <TacticalAssistant isOpen={assistantOpen} setIsOpen={setAssistantOpen} />
    </div>
  )
}
