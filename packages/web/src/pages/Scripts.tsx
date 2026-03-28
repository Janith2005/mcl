import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Bold,
  Italic,
  Link,
  List,
  Captions,
  Sparkles,
  AudioWaveform,
  Search,
  FileText,
  History,
  Share2,
  Settings,
  Diamond,
  BarChart3,
  Loader2,
} from 'lucide-react'
import {
  getScripts,
  getScript,
  exportScriptPdf,
  rewriteScript,
  toneCheck,
  type ScriptSection,
} from '@/api/services'

const toolbarButtons = [
  { icon: Bold, label: 'Bold' },
  { icon: Italic, label: 'Italic' },
  { icon: Link, label: 'Link' },
  { icon: List, label: 'List' },
  { icon: Captions, label: 'Caption' },
]

const scriptCapabilities = [
  { label: 'Strategy', color: 'var(--ip-hook-question)', active: true },
  { label: 'Knowledge', color: 'var(--ip-hook-stat)', active: false },
  { label: 'Health', color: 'var(--ip-hook-visual-bridge)', active: false },
  { label: 'Growth', color: 'var(--ip-hook-direct-payoff)', active: false },
]

function BeatSheetPanel({
  sections,
  activeSection,
  onSelect,
}: {
  sections: ScriptSection[]
  activeSection: string
  onSelect: (id: string) => void
}) {
  return (
    <div
      className="w-72 flex-shrink-0 overflow-y-auto p-5"
      style={{
        background: 'linear-gradient(180deg, #A666AA 0%, #E879A8 60%, #F5A0C0 100%)',
        borderRight: '1px solid var(--ip-border-subtle)',
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--ip-font-display)' }}
        >
          Beat Sheet
        </h2>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: 'rgba(255,255,255,0.25)', color: '#FFFFFF' }}
        >
          {sections.length}
        </div>
      </div>

      <div className="space-y-3">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSelect(section.id)}
            className="w-full text-left p-4 transition-all"
            style={{
              background: activeSection === section.id ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.18)',
              borderRadius: 'var(--ip-radius-md)',
              borderLeft: `3px solid ${section.accent_color}`,
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: section.accent_color }}>
                {section.label}
              </span>
              <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {section.word_count}/{section.total_words}
              </span>
            </div>
            <h3 className="text-sm font-semibold mb-1" style={{ color: '#FFFFFF', fontFamily: 'var(--ip-font-display)' }}>
              {section.title}
            </h3>
            <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {section.description}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-3 px-1">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'rgba(255,255,255,0.25)' }}
        >
          CV
        </div>
        <div>
          <p className="text-xs font-semibold" style={{ color: '#FFFFFF' }}>Captain Vane</p>
          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Pro Plan</p>
        </div>
      </div>
    </div>
  )
}

export function Scripts() {
  const [activeSection, setActiveSection] = useState<string>('')
  const [toneResult, setToneResult] = useState<string | null>(null)
  const [rewriteResult, setRewriteResult] = useState<string | null>(null)

  const { data: scriptList = [] } = useQuery({
    queryKey: ['scripts'],
    queryFn: getScripts,
  })

  const currentScriptId = scriptList[0]?.id ?? ''

  const { data: script, isLoading: scriptLoading } = useQuery({
    queryKey: ['script', currentScriptId],
    queryFn: () => getScript(currentScriptId),
    enabled: !!currentScriptId,
  })

  const sections = script?.sections ?? []
  const resolvedSection = activeSection || sections[0]?.id || ''
  const currentContent = sections.find((s) => s.id === resolvedSection)

  const exportMutation = useMutation({
    mutationFn: () => exportScriptPdf(currentScriptId),
  })

  const rewriteMutation = useMutation({
    mutationFn: () => rewriteScript(currentScriptId, resolvedSection),
    onSuccess: (data) => setRewriteResult(data.content),
  })

  const toneMutation = useMutation({
    mutationFn: () => toneCheck(currentScriptId),
    onSuccess: (data) => setToneResult(data.result),
  })

  const scriptTitle = script?.title ?? scriptList[0]?.title ?? 'No Script'

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-8">
      {/* Top Bar */}
      <div
        className="flex items-center gap-4 px-6 py-3 flex-shrink-0"
        style={{ background: 'var(--ip-surface)', borderBottom: '1px solid var(--ip-border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--ip-text-secondary)' }}>
            Influence Pirates
          </span>
          <span style={{ color: 'var(--ip-text-tertiary)' }}>/</span>
          <span className="text-sm font-bold" style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}>
            {scriptTitle}
          </span>
        </div>

        <div className="flex-1" />

        <div
          className="flex items-center gap-2 px-3 py-1.5 text-sm"
          style={{
            background: 'var(--ip-bg-subtle)',
            borderRadius: 'var(--ip-radius-full)',
            border: '1px solid var(--ip-border-subtle)',
            color: 'var(--ip-text-tertiary)',
          }}
        >
          <Search size={14} />
          <span className="text-xs">Search project scripts...</span>
        </div>

        <button
          onClick={() => currentScriptId && exportMutation.mutate()}
          disabled={!currentScriptId || exportMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
          style={{
            background: 'var(--ip-bg-subtle)',
            borderRadius: 'var(--ip-radius-full)',
            border: '1px solid var(--ip-border)',
            color: 'var(--ip-text)',
          }}
        >
          {exportMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
          PDF Export
        </button>

        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
          style={{
            background: 'var(--ip-bg-subtle)',
            borderRadius: 'var(--ip-radius-full)',
            border: '1px solid var(--ip-border)',
            color: 'var(--ip-text)',
          }}
        >
          <History size={13} />
          Version History
        </button>

        <button
          onClick={() => {
            if (script) navigator.clipboard.writeText(window.location.href)
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
          style={{
            background: 'var(--ip-bg-subtle)',
            borderRadius: 'var(--ip-radius-full)',
            border: '1px solid var(--ip-border)',
            color: 'var(--ip-text)',
          }}
        >
          <Share2 size={13} />
          Share
        </button>

        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--ip-bg-subtle)', color: 'var(--ip-text-tertiary)' }}
        >
          <Settings size={16} />
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'var(--ip-primary-gradient)' }}
        >
          CV
        </div>
      </div>

      {/* Main Area */}
      <div className="flex gap-0 flex-1 min-h-0">
        {scriptLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--ip-primary)' }} />
          </div>
        ) : sections.length === 0 ? (
          <>
            <div
              className="w-72 flex-shrink-0 p-5 flex items-center justify-center"
              style={{
                background: 'linear-gradient(180deg, #A666AA 0%, #E879A8 60%, #F5A0C0 100%)',
                borderRight: '1px solid var(--ip-border-subtle)',
              }}
            >
              <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {scriptList.length === 0
                  ? 'No scripts yet. Generate one from the pipeline.'
                  : 'Loading script sections...'}
              </p>
            </div>
            <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--ip-bg)' }}>
              <p className="text-sm" style={{ color: 'var(--ip-text-tertiary)' }}>
                Select a script to start editing.
              </p>
            </div>
          </>
        ) : (
          <>
            <BeatSheetPanel
              sections={sections}
              activeSection={resolvedSection}
              onSelect={setActiveSection}
            />

            {/* Center Editor */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
              {/* Toolbar */}
              <div
                className="flex items-center gap-1 px-6 py-3"
                style={{ background: 'var(--ip-surface)', borderBottom: '1px solid var(--ip-border-subtle)' }}
              >
                {toolbarButtons.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    title={label}
                    className="w-9 h-9 flex items-center justify-center rounded transition-colors hover:bg-[var(--ip-bg-subtle)]"
                    style={{ color: 'var(--ip-text-secondary)' }}
                  >
                    <Icon size={18} />
                  </button>
                ))}
                <div className="flex-1" />
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider mr-1"
                    style={{ color: 'var(--ip-text-tertiary)' }}
                  >
                    Script Capabilities
                  </span>
                  {scriptCapabilities.map((cap) => (
                    <span
                      key={cap.label}
                      className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium"
                      style={{
                        background: cap.active ? cap.color : 'transparent',
                        color: cap.active ? 'white' : 'var(--ip-text-tertiary)',
                        border: cap.active ? 'none' : '1px solid var(--ip-border)',
                        borderRadius: 'var(--ip-radius-full)',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: cap.active ? 'white' : cap.color }}
                      />
                      {cap.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-y-auto px-12 py-8" style={{ background: 'var(--ip-bg)' }}>
                {currentContent && (
                  <div
                    className="max-w-2xl mx-auto p-8"
                    style={{
                      background: 'var(--ip-card-glass-bg)',
                      backdropFilter: 'blur(var(--ip-card-glass-blur))',
                      borderRadius: 'var(--ip-radius-lg)',
                      boxShadow: 'var(--ip-card-glass-shadow)',
                      border: '1px solid var(--ip-card-glass-border)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-6">
                      <span style={{ color: 'var(--ip-primary)' }}>
                        <Diamond size={14} />
                      </span>
                      <span
                        className="text-xs font-bold uppercase tracking-widest"
                        style={{ color: 'var(--ip-primary)' }}
                      >
                        {currentContent.title}
                      </span>
                    </div>

                    <div className="space-y-6">
                      {currentContent.content.split('\n\n').map((paragraph, idx) => (
                        <p
                          key={idx}
                          className={idx === 0 ? 'text-3xl font-bold leading-tight' : 'text-base leading-relaxed'}
                          style={{
                            fontFamily: idx === 0 ? 'var(--ip-font-display)' : 'var(--ip-font-body)',
                            color: 'var(--ip-text)',
                          }}
                        >
                          {paragraph}
                        </p>
                      ))}
                    </div>

                    {(rewriteResult || toneResult) && (
                      <div
                        className="mt-6 p-4"
                        style={{
                          background: 'var(--ip-bg-subtle)',
                          borderRadius: 'var(--ip-radius-md)',
                          border: '1px solid var(--ip-border-subtle)',
                        }}
                      >
                        {rewriteResult && (
                          <div className="mb-3">
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ip-primary)' }}>
                              AI Rewrite
                            </p>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--ip-text)' }}>
                              {rewriteResult}
                            </p>
                          </div>
                        )}
                        {toneResult && (
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--ip-info)' }}>
                              Tone Check
                            </p>
                            <p className="text-sm leading-relaxed" style={{ color: 'var(--ip-text)' }}>
                              {toneResult}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="max-w-2xl mx-auto mt-6 flex justify-end">
                  <div
                    className="p-4 w-48"
                    style={{
                      background: 'var(--ip-card-glass-bg)',
                      backdropFilter: 'blur(var(--ip-card-glass-blur))',
                      borderRadius: 'var(--ip-radius-lg)',
                      boxShadow: 'var(--ip-card-glass-shadow)',
                      border: '1px solid var(--ip-card-glass-border)',
                    }}
                  >
                    <p
                      className="text-[10px] font-bold uppercase tracking-wider mb-2"
                      style={{ color: 'var(--ip-text-tertiary)' }}
                    >
                      Live Feedback
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
                        High Impact
                      </span>
                      <BarChart3 size={20} style={{ color: 'var(--ip-primary)' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Action Buttons */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
                <button
                  onClick={() => currentScriptId && rewriteMutation.mutate()}
                  disabled={!currentScriptId || rewriteMutation.isPending}
                  className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{
                    background: 'var(--ip-primary-gradient)',
                    borderRadius: 'var(--ip-radius-full)',
                    boxShadow: 'var(--ip-shadow-glow)',
                  }}
                >
                  {rewriteMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  AI Rewrite
                </button>
                <button
                  onClick={() => currentScriptId && toneMutation.mutate()}
                  disabled={!currentScriptId || toneMutation.isPending}
                  className="flex items-center gap-2 px-5 py-3 text-sm font-medium shadow-md transition-colors hover:bg-[var(--ip-surface-hover)] disabled:opacity-50"
                  style={{
                    background: 'var(--ip-card-glass-bg)',
                    backdropFilter: 'blur(var(--ip-card-glass-blur))',
                    borderRadius: 'var(--ip-radius-full)',
                    border: '1px solid var(--ip-card-glass-border)',
                    color: 'var(--ip-text)',
                  }}
                >
                  {toneMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <AudioWaveform size={16} />}
                  Tone Check
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
