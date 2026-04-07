import { useState, useEffect } from 'react'

type LegalTab = 'terms' | 'privacy'

const TAB_CONFIG: { id: LegalTab; label: string; file: string }[] = [
  { id: 'terms', label: 'Terms of Service', file: '/legal/terms.md' },
  { id: 'privacy', label: 'Privacy Policy', file: '/legal/privacy.md' },
]

interface MarkdownNode {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'em' | 'li'
  text: string
}

/**
 * Parse markdown into structured nodes for safe rendering.
 */
function parseMarkdown(md: string): MarkdownNode[] {
  const lines = md.split('\n')
  const nodes: MarkdownNode[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    if (trimmed.startsWith('# ')) {
      nodes.push({ type: 'h1', text: trimmed.slice(2) })
    } else if (trimmed.startsWith('## ')) {
      nodes.push({ type: 'h2', text: trimmed.slice(3) })
    } else if (trimmed.startsWith('### ')) {
      nodes.push({ type: 'h3', text: trimmed.slice(4) })
    } else if (trimmed.startsWith('- ')) {
      nodes.push({ type: 'li', text: trimmed.slice(2) })
    } else if (trimmed.startsWith('*') && trimmed.endsWith('*') && trimmed.length > 2) {
      nodes.push({ type: 'em', text: trimmed.slice(1, -1) })
    } else {
      nodes.push({ type: 'p', text: trimmed })
    }
  }

  return nodes
}

function InlineText({ text }: { text: string }) {
  // Split on **bold** patterns, then render
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function MarkdownContent({ nodes }: { nodes: MarkdownNode[] }) {
  return (
    <div style={{ lineHeight: 1.7 }}>
      {nodes.map((node, i) => {
        switch (node.type) {
          case 'h1':
            return (
              <h1
                key={i}
                className="text-2xl md:text-3xl font-bold mb-2"
                style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
              >
                {node.text}
              </h1>
            )
          case 'h2':
            return (
              <h2
                key={i}
                className="text-lg font-semibold mt-8 mb-2"
                style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
              >
                {node.text}
              </h2>
            )
          case 'h3':
            return (
              <h3
                key={i}
                className="text-base font-semibold mt-5 mb-1"
                style={{ color: 'var(--ip-text)' }}
              >
                {node.text}
              </h3>
            )
          case 'em':
            return (
              <p
                key={i}
                className="text-sm mb-6"
                style={{ color: 'var(--ip-text-tertiary, #94a3b8)' }}
              >
                <em>{node.text}</em>
              </p>
            )
          case 'li':
            return (
              <div
                key={i}
                className="flex gap-2 ml-4 mb-1 text-sm"
                style={{ color: 'var(--ip-text-secondary, #475569)' }}
              >
                <span style={{ color: 'var(--ip-primary, #6366f1)' }}>&#x2022;</span>
                <span><InlineText text={node.text} /></span>
              </div>
            )
          case 'p':
            return (
              <p
                key={i}
                className="text-sm mb-3"
                style={{ color: 'var(--ip-text-secondary, #475569)' }}
              >
                <InlineText text={node.text} />
              </p>
            )
        }
      })}
    </div>
  )
}

export function Legal() {
  const [activeTab, setActiveTab] = useState<LegalTab>('terms')
  const [nodes, setNodes] = useState<MarkdownNode[]>([])
  const [loading, setLoading] = useState(true)

  function handleTabChange(tab: LegalTab) {
    setLoading(true)
    setActiveTab(tab)
  }

  useEffect(() => {
    const config = TAB_CONFIG.find((t) => t.id === activeTab)
    if (!config) return

    fetch(config.file)
      .then((res) => res.text())
      .then((md) => {
        setNodes(parseMarkdown(md))
        setLoading(false)
      })
      .catch(() => {
        setNodes([{ type: 'p', text: 'Failed to load document.' }])
        setLoading(false)
      })
  }, [activeTab])

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--ip-bg, #f8f9fa)', color: 'var(--ip-text, #1a1a2e)' }}
    >
      {/* Navigation bar */}
      <nav
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: '1px solid var(--ip-border-subtle, #e2e8f0)' }}
      >
        <a
          href="/"
          className="text-lg font-bold"
          style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
        >
          Influencer Pirates
        </a>
        <a
          href="/login"
          className="text-sm font-medium"
          style={{ color: 'var(--ip-primary, #6366f1)' }}
        >
          Sign In
        </a>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Tab bar */}
        <div
          className="flex gap-1 p-1 mb-8 w-fit"
          style={{
            background: 'var(--ip-surface, #ffffff)',
            borderRadius: 'var(--ip-radius-full, 9999px)',
            border: '1px solid var(--ip-border-subtle, #e2e8f0)',
          }}
        >
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="py-2 px-5 text-sm font-medium transition-all"
              style={{
                borderRadius: 'var(--ip-radius-full, 9999px)',
                background: activeTab === tab.id ? 'var(--ip-text, #1a1a2e)' : 'transparent',
                color: activeTab === tab.id
                  ? 'var(--ip-text-on-primary, #ffffff)'
                  : 'var(--ip-text-secondary, #64748b)',
                boxShadow: activeTab === tab.id ? 'var(--ip-shadow-sm)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-sm" style={{ color: 'var(--ip-text-tertiary)' }}>
            Loading...
          </div>
        ) : (
          <MarkdownContent nodes={nodes} />
        )}
      </div>
    </div>
  )
}
