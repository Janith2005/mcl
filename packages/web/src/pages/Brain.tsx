import { useState } from 'react'
import {
  Users,
  ShieldAlert,
  Zap,
  ChevronRight,
} from 'lucide-react'

export function BrainPage() {
  const [syncing, setSyncing] = useState(false)

  function handleSync() {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 2000)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10" style={{ background: 'var(--ip-bg)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="mb-8">
          <h1
            className="text-4xl md:text-5xl font-bold leading-tight mb-3"
            style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
          >
            Agent Brain{' '}
            <span
              style={{
                fontFamily: 'var(--ip-font-serif)',
                fontStyle: 'italic',
                fontWeight: 400,
              }}
            >
              Maturity
            </span>
          </h1>
          <p
            className="text-sm md:text-base max-w-xl leading-relaxed"
            style={{ color: 'var(--ip-text-secondary)' }}
          >
            Your tactical assistant's knowledge base is currently in high-frequency
            synchronization. Tuning these parameters directly influences script
            generation and campaign strategy.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-10">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="py-2.5 px-6 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            style={{
              background: 'var(--ip-primary-gradient)',
              borderRadius: 'var(--ip-radius-full)',
              color: 'var(--ip-text-on-primary)',
            }}
          >
            {syncing ? 'Syncing...' : 'Initiate Deep Sync'}
          </button>
          <button
            className="py-2.5 px-6 text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{
              background: 'linear-gradient(135deg, var(--ip-primary-end) 0%, var(--ip-primary) 100%)',
              borderRadius: 'var(--ip-radius-full)',
              color: 'var(--ip-text-on-primary)',
            }}
          >
            Export Schema
          </button>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          {/* Target Audience Persona */}
          <div
            className="col-span-1 lg:col-span-2 p-6"
            style={{
              background: 'var(--ip-surface-glass)',
              backdropFilter: 'blur(var(--ip-glass-blur))',
              borderRadius: 'var(--ip-radius-lg)',
              boxShadow: 'var(--ip-shadow-md)',
              border: '1px solid var(--ip-border-subtle)',
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--ip-bg-subtle)' }}
              >
                <Users size={18} style={{ color: 'var(--ip-primary)' }} />
              </div>
              <h2
                className="text-lg font-bold"
                style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
              >
                Target Audience Persona
              </h2>
            </div>

            {/* Core Demographics */}
            <div className="mb-5">
              <p
                className="text-[10px] tracking-widest font-semibold mb-2"
                style={{ color: 'var(--ip-text-tertiary)' }}
              >
                CORE DEMOGRAPHICS
              </p>
              <div
                className="p-4 text-sm leading-relaxed"
                style={{
                  background: 'var(--ip-bg-subtle)',
                  borderRadius: 'var(--ip-radius-md)',
                  color: 'var(--ip-text-secondary)',
                  border: '1px solid var(--ip-border-subtle)',
                }}
              >
                Tech-forward professionals aged 25-45, operating in high-growth startups
                and creative agencies. They value efficiency, directness, and aesthetic.
              </div>
            </div>

            {/* Main Points & Desires */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p
                  className="text-[10px] tracking-widest font-semibold mb-2"
                  style={{ color: 'var(--ip-text-tertiary)' }}
                >
                  MAIN POINTS
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ip-text-secondary)' }}>
                  Standard SaaS fatigue, fragmented data, high operational costs.
                </p>
              </div>
              <div>
                <p
                  className="text-[10px] tracking-widest font-semibold mb-2"
                  style={{ color: 'var(--ip-text-tertiary)' }}
                >
                  DESIRES
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ip-text-secondary)' }}>
                  Unified tactical control, brand consistency, AI augmentation.
                </p>
              </div>
            </div>
          </div>

          {/* Topic Constraints */}
          <div
            className="p-6"
            style={{
              background: 'var(--ip-surface-glass)',
              backdropFilter: 'blur(var(--ip-glass-blur))',
              borderRadius: 'var(--ip-radius-lg)',
              boxShadow: 'var(--ip-shadow-md)',
              border: '1px solid var(--ip-border-subtle)',
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--ip-bg-subtle)' }}
              >
                <ShieldAlert size={18} style={{ color: 'var(--ip-primary)' }} />
              </div>
              <h2
                className="text-lg font-bold"
                style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
              >
                Topic Constraints
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: 'var(--ip-error)' }}
                  />
                  <p className="text-sm font-semibold" style={{ color: 'var(--ip-text)' }}>
                    No Heavy Sales
                  </p>
                </div>
                <p className="text-xs ml-4" style={{ color: 'var(--ip-text-secondary)' }}>
                  Avoid "Click here" or "Limited time" jargon.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: 'var(--ip-warning)' }}
                  />
                  <p className="text-sm font-semibold" style={{ color: 'var(--ip-text)' }}>
                    Strict Jargon Policy
                  </p>
                </div>
                <p className="text-xs ml-4" style={{ color: 'var(--ip-text-secondary)' }}>
                  Do not use overused tech buzzwords (e.g., 'Synergy').
                </p>
              </div>
            </div>

            <button
              className="mt-5 py-2 px-4 text-xs font-medium transition-colors"
              style={{
                border: '1px solid var(--ip-border)',
                borderRadius: 'var(--ip-radius-full)',
                color: 'var(--ip-text-secondary)',
                background: 'transparent',
              }}
            >
              Add New Guardrail
            </button>
          </div>

          {/* Recently Learned Insights */}
          <div
            className="p-6"
            style={{
              background: 'var(--ip-surface-glass)',
              backdropFilter: 'blur(var(--ip-glass-blur))',
              borderRadius: 'var(--ip-radius-lg)',
              boxShadow: 'var(--ip-shadow-md)',
              border: '1px solid var(--ip-border-subtle)',
            }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--ip-bg-subtle)' }}
              >
                <Zap size={18} style={{ color: 'var(--ip-primary)' }} />
              </div>
              <h2
                className="text-lg font-bold"
                style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
              >
                Recently Learned Insights
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  num: '01',
                  title: 'Adolescent Hook Efficiency',
                  desc: 'Hooks starting with data visualizations have higher engagement.',
                },
                {
                  num: '02',
                  title: 'Night Cycle Reach',
                  desc: 'Technical deep-dives perform best on Tuesdays at 22:00 UTC.',
                },
              ].map((insight) => (
                <div
                  key={insight.num}
                  className="flex items-start gap-3 group cursor-pointer"
                >
                  <span
                    className="text-lg font-bold leading-none mt-0.5"
                    style={{ color: 'var(--ip-primary)', fontFamily: 'var(--ip-font-display)' }}
                  >
                    {insight.num}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--ip-text)' }}>
                      {insight.title}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--ip-text-secondary)' }}>
                      {insight.desc}
                    </p>
                  </div>
                  <ChevronRight
                    size={16}
                    className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--ip-text-tertiary)' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Usage Meter */}
        <div
          className="inline-flex flex-col gap-1.5 p-4"
          style={{
            background: 'var(--ip-surface-glass)',
            backdropFilter: 'blur(var(--ip-glass-blur))',
            borderRadius: 'var(--ip-radius-md)',
            boxShadow: 'var(--ip-shadow-sm)',
            border: '1px solid var(--ip-border-subtle)',
          }}
        >
          <p
            className="text-[10px] tracking-widest font-semibold"
            style={{ color: 'var(--ip-text-tertiary)' }}
          >
            USAGE
          </p>
          <p className="text-sm font-bold" style={{ color: 'var(--ip-text)' }}>
            751 / 1,000 AI mins
          </p>
          <div
            className="w-40 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--ip-border)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: '75.1%',
                background: 'var(--ip-primary-gradient)',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
