import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, MoreVertical, Sparkles, BookmarkPlus, Loader2 } from 'lucide-react'
import { getHooks, getSwipeHooks, refineHook, type Hook, type SwipeHook } from '@/api/services'

const hookPatterns = [
  'The Question',
  'The Stat',
  'The Negative Stake',
  'The Contrarian',
  'The Visual Bridge',
  'The Direct Payoff',
] as const

type HookPattern = (typeof hookPatterns)[number]

function getRiskColor(risk: 'Low' | 'Medium' | 'High') {
  switch (risk) {
    case 'Low': return 'var(--ip-success)'
    case 'Medium': return 'var(--ip-warning)'
    case 'High': return 'var(--ip-error)'
  }
}

function HookCard({ hook }: { hook: Hook }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const refineMutation = useMutation({
    mutationFn: () => refineHook(hook.id),
  })

  function handleAddToScript() {
    navigate('/scripts')
  }

  return (
    <div
      className="p-6 transition-all hover:translate-y-[-1px]"
      style={{
        background: 'var(--ip-card-glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 'var(--ip-radius-lg)',
        boxShadow: 'var(--ip-shadow-md)',
        border: '1px solid var(--ip-border-subtle)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span
          className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase"
          style={{
            background: hook.badge_color,
            color: 'white',
            borderRadius: 'var(--ip-radius-full)',
          }}
        >
          {hook.badge}
        </span>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="p-1 rounded hover:bg-[var(--ip-bg-subtle)]"
          >
            <MoreVertical size={16} style={{ color: 'var(--ip-text-tertiary)' }} />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-6 z-10 py-1 w-32 text-sm"
              style={{
                background: 'var(--ip-surface)',
                border: '1px solid var(--ip-border-subtle)',
                borderRadius: 'var(--ip-radius-md)',
                boxShadow: 'var(--ip-shadow-lg)',
              }}
            >
              <button
                onClick={() => { handleAddToScript(); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--ip-bg-subtle)] transition-colors"
                style={{ color: 'var(--ip-text)' }}
              >
                Add to Script
              </button>
              <button
                onClick={() => { refineMutation.mutate(); setMenuOpen(false) }}
                className="w-full text-left px-3 py-2 hover:bg-[var(--ip-bg-subtle)] transition-colors"
                style={{ color: 'var(--ip-text)' }}
              >
                Refine with AI
              </button>
            </div>
          )}
        </div>
      </div>

      <p
        className="text-xl font-bold mb-6 leading-snug"
        style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)', fontStyle: 'italic' }}
      >
        {hook.text}
      </p>

      <div className="flex items-end gap-8 mb-5">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>
            Engagement Potential
          </p>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tabular-nums" style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}>
              {hook.engagement_potential}%
            </span>
            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--ip-border)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${hook.engagement_potential}%`, background: 'var(--ip-primary-gradient)' }}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>
            Retention Risk
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: getRiskColor(hook.retention_risk) }}>
              {hook.retention_risk}
            </span>
            <div className="w-10 h-1 rounded-full" style={{ background: getRiskColor(hook.retention_risk) }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleAddToScript}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
        >
          <Plus size={16} />
          Add to Script
        </button>
        <button
          onClick={() => refineMutation.mutate()}
          disabled={refineMutation.isPending}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--ip-bg-subtle)]"
          style={{
            border: '1px solid var(--ip-border)',
            borderRadius: 'var(--ip-radius-full)',
            color: 'var(--ip-text-secondary)',
            background: 'transparent',
          }}
        >
          {refineMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
          Refine AI
        </button>
      </div>

      {refineMutation.isSuccess && (
        <p className="text-xs mt-2" style={{ color: 'var(--ip-success)' }}>Hook refinement queued!</p>
      )}
    </div>
  )
}

function SwipeLibrary({ swipes }: { swipes: SwipeHook[] }) {
  const navigate = useNavigate()

  return (
    <div
      className="sticky top-8 p-4"
      style={{
        background: 'var(--ip-card-glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 'var(--ip-radius-lg)',
        boxShadow: 'var(--ip-shadow-md)',
        border: '1px solid var(--ip-border-subtle)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
          Swipe Library
        </h3>
        <BookmarkPlus size={16} style={{ color: 'var(--ip-text-tertiary)' }} />
      </div>

      <div className="space-y-3">
        {swipes.map((swipe) => (
          <div
            key={swipe.id}
            className="p-3 cursor-pointer transition-colors hover:bg-[var(--ip-bg-subtle)]"
            style={{
              background: 'var(--ip-bg-subtle)',
              borderRadius: 'var(--ip-radius-md)',
              border: '1px solid var(--ip-border-subtle)',
              borderLeft: '3px solid var(--ip-primary)',
            }}
          >
            <p className="text-sm font-medium mb-1 leading-snug" style={{ color: 'var(--ip-text)' }}>
              {swipe.text}
            </p>
            <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: 'var(--ip-text-tertiary)' }}>
              SUCCESS RATE: {swipe.success_rate}%
            </p>
          </div>
        ))}
        {swipes.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: 'var(--ip-text-tertiary)' }}>
            No swipe hooks yet.
          </p>
        )}
      </div>

      <button
        onClick={() => navigate('/hooks')}
        className="w-full mt-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
        style={{ color: 'var(--ip-text-brand)', borderRadius: 'var(--ip-radius-md)' }}
      >
        Explore All Swipes
      </button>

      <div
        className="mt-4 p-4 text-white"
        style={{
          background: 'linear-gradient(135deg, #1A1A2E 0%, #3D1C4F 100%)',
          borderRadius: 'var(--ip-radius-md)',
        }}
      >
        <p className="text-sm font-bold mb-1">New: Psychological Trigger Pack</p>
        <p className="text-xs opacity-80 mb-3">Unlock 50+ high-retention hook frames.</p>
        <button
          onClick={() => navigate('/settings')}
          className="px-4 py-1.5 text-xs font-semibold"
          style={{
            background: 'var(--ip-primary-gradient)',
            color: 'white',
            borderRadius: 'var(--ip-radius-full)',
            border: 'none',
          }}
        >
          Upgrade Now
        </button>
      </div>
    </div>
  )
}

export function Hooks() {
  const [activePattern, setActivePattern] = useState<HookPattern | 'All'>('All')

  const { data: hooks = [], isLoading: hooksLoading } = useQuery({
    queryKey: ['hooks'],
    queryFn: getHooks,
  })

  const { data: swipes = [] } = useQuery({
    queryKey: ['swipe-hooks'],
    queryFn: getSwipeHooks,
  })

  const filteredHooks =
    activePattern === 'All' ? hooks : hooks.filter((h) => h.pattern === activePattern)

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <div className="mb-6">
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
          >
            Psychological Hooks
          </h1>
          <p className="text-sm" style={{ color: 'var(--ip-text-secondary)' }}>
            Deploy high-retention entry points designed to bypass the 'scroll-reflex' using
            algorithmic psychological triggers.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {hookPatterns.map((pattern) => (
            <button
              key={pattern}
              onClick={() => setActivePattern(activePattern === pattern ? 'All' : pattern)}
              className="px-4 py-2 text-sm font-medium transition-all"
              style={{
                borderRadius: 'var(--ip-radius-full)',
                background: activePattern === pattern ? 'var(--ip-primary-gradient)' : 'transparent',
                color: activePattern === pattern ? 'var(--ip-text-on-primary)' : 'var(--ip-text)',
                border: activePattern === pattern ? '1px solid transparent' : '1px solid var(--ip-border)',
                boxShadow: activePattern === pattern ? 'var(--ip-shadow-sm)' : 'none',
              }}
            >
              {pattern}
            </button>
          ))}
        </div>

        {hooksLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--ip-primary)' }} />
          </div>
        ) : (
          <div className="space-y-5">
            {filteredHooks.map((hook) => (
              <HookCard key={hook.id} hook={hook} />
            ))}
            {filteredHooks.length === 0 && (
              <div
                className="p-8 text-center"
                style={{
                  background: 'var(--ip-card-glass-bg)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: 'var(--ip-radius-lg)',
                  border: '1px solid var(--ip-border-subtle)',
                }}
              >
                <p className="text-sm" style={{ color: 'var(--ip-text-tertiary)' }}>
                  {activePattern === 'All'
                    ? 'No hooks generated yet. Run the pipeline to generate hooks.'
                    : `No hooks for pattern "${activePattern}" yet.`}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="w-64 flex-shrink-0">
        <SwipeLibrary swipes={swipes} />
      </div>
    </div>
  )
}
