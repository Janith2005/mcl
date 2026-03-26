import { useState } from 'react'
import { Send, X, MessageSquare, BarChart3, ScrollText } from 'lucide-react'

type Tab = 'chat' | 'insights' | 'logs'

export function TacticalAssistant() {
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [message, setMessage] = useState('')

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-4 w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg z-50 hover:opacity-90 transition-opacity"
        style={{ background: 'var(--ip-primary-gradient)' }}
      >
        <MessageSquare size={20} />
      </button>
    )
  }

  const tabs: { id: Tab; label: string; icon: typeof MessageSquare }[] = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
    { id: 'logs', label: 'Logs', icon: ScrollText },
  ]

  return (
    <aside
      className="fixed right-0 top-0 h-screen flex flex-col z-30"
      style={{
        width: 'var(--ip-assistant-width)',
        background: 'var(--ip-surface)',
        borderLeft: '1px solid var(--ip-border-subtle)',
        boxShadow: 'var(--ip-shadow-lg), inset 1px 0 0 rgba(166, 102, 170, 0.08), var(--ip-shadow-glow-border)',
      }}
    >
      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--ip-border-subtle)' }}>
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ip-text-brand)', fontFamily: 'var(--ip-font-display)' }}>
            Tactical Assistant
          </h3>
          <p className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>Viral Potential: High</p>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-[var(--ip-bg-subtle)]">
          <X size={16} style={{ color: 'var(--ip-text-secondary)' }} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-4 pt-3 gap-1" style={{ borderBottom: '1px solid var(--ip-border-subtle)' }}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="px-3 py-2 text-xs font-medium transition-colors"
            style={{
              color: activeTab === id ? 'var(--ip-text-brand)' : 'var(--ip-text-tertiary)',
              borderBottom: activeTab === id ? '2px solid var(--ip-primary)' : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {activeTab === 'chat' && (
          <div className="space-y-3">
            <div
              className="p-3 text-sm"
              style={{
                background: 'var(--ip-bg-subtle)',
                borderRadius: 'var(--ip-radius-md)',
                color: 'var(--ip-text-secondary)',
              }}
            >
              I've analyzed the last 2 videos. Your retention drops at 0:14. We need to introduce the "Negative Stake" earlier in the script.
            </div>
            <p className="text-xs font-medium" style={{ color: 'var(--ip-text-tertiary)' }}>SUGGESTED ACTIONS</p>
            <button
              className="w-full text-left p-3 text-sm flex items-center gap-2 transition-colors hover:bg-[var(--ip-bg-subtle)]"
              style={{ borderRadius: 'var(--ip-radius-md)', border: '1px solid var(--ip-border)' }}
            >
              <span>⚡</span> Generate 5 "Stake" variations
            </button>
            <button
              className="w-full text-left p-3 text-sm flex items-center gap-2 transition-colors hover:bg-[var(--ip-bg-subtle)]"
              style={{ borderRadius: 'var(--ip-radius-md)', border: '1px solid var(--ip-border)' }}
            >
              <span>📊</span> Research retention peaks
            </button>
          </div>
        )}
        {activeTab === 'insights' && (
          <p className="text-sm" style={{ color: 'var(--ip-text-tertiary)' }}>Performance insights will appear after your first analytics run.</p>
        )}
        {activeTab === 'logs' && (
          <p className="text-sm" style={{ color: 'var(--ip-text-tertiary)' }}>Activity logs will appear as you use the pipeline.</p>
        )}
      </div>

      {/* Input + ASK STRATEGY */}
      <div className="px-4 py-3 space-y-3" style={{ borderTop: '1px solid var(--ip-border-subtle)' }}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask strategy..."
            className="flex-1 text-sm py-2 px-3 outline-none"
            style={{
              background: 'var(--ip-bg-subtle)',
              borderRadius: 'var(--ip-radius-full)',
              color: 'var(--ip-text)',
              border: '1px solid var(--ip-border)',
            }}
          />
          <button
            className="w-9 h-9 flex items-center justify-center text-white shrink-0"
            style={{
              background: 'var(--ip-primary-gradient)',
              borderRadius: 'var(--ip-radius-full)',
            }}
          >
            <Send size={14} />
          </button>
        </div>
        <button
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold tracking-wide text-white transition-all hover:opacity-90"
          style={{
            background: 'var(--ip-primary-gradient)',
            borderRadius: 'var(--ip-radius-md)',
            boxShadow: 'var(--ip-shadow-md)',
            letterSpacing: '0.05em',
          }}
        >
          ASK STRATEGY
        </button>
      </div>
    </aside>
  )
}
