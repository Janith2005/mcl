import { useState, useRef, useEffect } from 'react'
import { Send, X, MessageSquare, BarChart3, ScrollText, Loader2, CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { sendChatMessage, askStrategy, getAnalytics, listJobs, type ChatMessage } from '@/api/services'

type Tab = 'chat' | 'insights' | 'logs'

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'init-1',
    role: 'assistant',
    content: "I've analyzed the last 2 videos. Your retention drops at 0:14. We need to introduce the \"Negative Stake\" earlier in the script.",
    created_at: new Date().toISOString(),
  },
]

function InsightsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics', '7d'],
    queryFn: () => getAnalytics('7d'),
  })

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--ip-primary)' }} /></div>
  if (!data) return <p className="text-sm" style={{ color: 'var(--ip-text-tertiary)' }}>Run an analytics job to see insights here.</p>

  return (
    <div className="space-y-5">
      {data.top_performers?.length > 0 && (
        <div>
          <p className="text-[10px] tracking-widest font-semibold mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>TOP PERFORMERS</p>
          <div className="space-y-2">
            {data.top_performers.slice(0, 4).map(p => (
              <div key={p.id} className="p-2.5 rounded-lg" style={{ background: 'var(--ip-bg-subtle)', border: '1px solid var(--ip-border-subtle)' }}>
                <p className="text-xs font-medium leading-snug mb-1" style={{ color: 'var(--ip-text)' }}>{p.title}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold" style={{ color: p.trend === 'up' ? 'var(--ip-success)' : 'var(--ip-error)' }}>
                    {p.trend === 'up' ? '↑' : '↓'} {p.views}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: p.accent_color + '22', color: p.accent_color }}>
                    {p.category_label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.hook_pattern_data?.length > 0 && (
        <div>
          <p className="text-[10px] tracking-widest font-semibold mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>HOOK PATTERNS</p>
          <div className="space-y-1.5">
            {data.hook_pattern_data.slice(0, 4).map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ip-border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(h.avg_view, 100)}%`, background: h.color || 'var(--ip-primary)' }} />
                </div>
                <span className="text-[10px] w-20 truncate" style={{ color: 'var(--ip-text-secondary)' }}>{h.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LogsTab() {
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: listJobs,
    refetchInterval: 10000,
  })

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle size={12} style={{ color: 'var(--ip-success)' }} />
    if (status === 'failed') return <AlertCircle size={12} style={{ color: 'var(--ip-error)' }} />
    if (status === 'running') return <RefreshCw size={12} className="animate-spin" style={{ color: 'var(--ip-primary)' }} />
    return <Clock size={12} style={{ color: 'var(--ip-text-tertiary)' }} />
  }

  if (isLoading) return <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--ip-primary)' }} /></div>
  if (!jobs.length) return <p className="text-sm" style={{ color: 'var(--ip-text-tertiary)' }}>No pipeline activity yet.</p>

  return (
    <div className="space-y-2">
      {jobs.slice(0, 15).map(job => (
        <div key={job.id} className="flex items-start gap-2 py-1.5">
          <span className="mt-0.5 shrink-0">{statusIcon(job.status)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium capitalize" style={{ color: 'var(--ip-text)' }}>{job.type.replace(/_/g, ' ')}</p>
            <p className="text-[10px]" style={{ color: 'var(--ip-text-tertiary)' }}>
              {new Date(job.created_at).toLocaleString()}
            </p>
          </div>
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
            style={{
              background: job.status === 'completed' ? 'var(--ip-success)22' : job.status === 'failed' ? 'var(--ip-error)22' : job.status === 'running' ? 'var(--ip-primary)22' : 'var(--ip-border)',
              color: job.status === 'completed' ? 'var(--ip-success)' : job.status === 'failed' ? 'var(--ip-error)' : job.status === 'running' ? 'var(--ip-primary)' : 'var(--ip-text-tertiary)',
            }}
          >
            {job.status}
          </span>
        </div>
      ))}
    </div>
  )
}

interface TacticalAssistantProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function TacticalAssistant({ isOpen, setIsOpen }: TacticalAssistantProps) {
  const [activeTab, setActiveTab] = useState<Tab>('chat')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES)
  const bottomRef = useRef<HTMLDivElement>(null)

  const sendMutation = useMutation({
    mutationFn: (content: string) => sendChatMessage(content),
    onSuccess: (response) => {
      setMessages((prev) => [...prev, response])
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Something went wrong. Please try again.',
          created_at: new Date().toISOString(),
        },
      ])
    },
  })

  const strategyMutation = useMutation({
    mutationFn: () => askStrategy(),
    onSuccess: (response) => {
      setMessages((prev) => [...prev, response])
    },
  })

  function handleSend() {
    const content = input.trim()
    if (!content || sendMutation.isPending) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    sendMutation.mutate(content)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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
        boxShadow: 'var(--ip-shadow-lg)',
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
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 text-sm ${msg.role === 'user' ? 'ml-4' : ''}`}
                style={{
                  background: msg.role === 'user' ? 'var(--ip-primary-gradient)' : 'var(--ip-bg-subtle)',
                  borderRadius: 'var(--ip-radius-md)',
                  color: msg.role === 'user' ? 'white' : 'var(--ip-text-secondary)',
                }}
              >
                {msg.content}
              </div>
            ))}
            {sendMutation.isPending && (
              <div
                className="p-3 text-sm flex items-center gap-2"
                style={{ background: 'var(--ip-bg-subtle)', borderRadius: 'var(--ip-radius-md)', color: 'var(--ip-text-tertiary)' }}
              >
                <Loader2 size={14} className="animate-spin" />
                Thinking...
              </div>
            )}
            <div ref={bottomRef} />

            {messages.length === 1 && (
              <>
                <p className="text-xs font-medium" style={{ color: 'var(--ip-text-tertiary)' }}>SUGGESTED ACTIONS</p>
                <button
                  onClick={() => {
                    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: 'Generate 5 "Stake" variations', created_at: new Date().toISOString() }
                    setMessages((prev) => [...prev, userMsg])
                    sendMutation.mutate('Generate 5 "Stake" variations')
                  }}
                  className="w-full text-left p-3 text-sm flex items-center gap-2 transition-colors hover:bg-[var(--ip-bg-subtle)]"
                  style={{ borderRadius: 'var(--ip-radius-md)', border: '1px solid var(--ip-border)' }}
                >
                  <span>⚡</span> Generate 5 "Stake" variations
                </button>
                <button
                  onClick={() => {
                    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: 'Research retention peaks', created_at: new Date().toISOString() }
                    setMessages((prev) => [...prev, userMsg])
                    sendMutation.mutate('Research retention peaks')
                  }}
                  className="w-full text-left p-3 text-sm flex items-center gap-2 transition-colors hover:bg-[var(--ip-bg-subtle)]"
                  style={{ borderRadius: 'var(--ip-radius-md)', border: '1px solid var(--ip-border)' }}
                >
                  <span>📊</span> Research retention peaks
                </button>
              </>
            )}
          </div>
        )}
        {activeTab === 'insights' && <InsightsTab />}
        {activeTab === 'logs' && <LogsTab />}
      </div>

      {/* Input */}
      <div className="px-4 py-3 space-y-3" style={{ borderTop: '1px solid var(--ip-border-subtle)' }}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
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
            onClick={handleSend}
            disabled={!input.trim() || sendMutation.isPending}
            className="w-9 h-9 flex items-center justify-center text-white shrink-0 disabled:opacity-50"
            style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
          >
            {sendMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <button
          onClick={() => strategyMutation.mutate()}
          disabled={strategyMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold tracking-wide text-white transition-all hover:opacity-90 disabled:opacity-60"
          style={{
            background: 'var(--ip-primary-gradient)',
            borderRadius: 'var(--ip-radius-md)',
            boxShadow: 'var(--ip-shadow-md)',
            letterSpacing: '0.05em',
          }}
        >
          {strategyMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          ASK STRATEGY
        </button>
      </div>
    </aside>
  )
}
