import { useState } from 'react'
import { Plus, MoreVertical, Sparkles, BookmarkPlus } from 'lucide-react'

const hookPatterns = [
  'The Question',
  'The Stat',
  'The Negative Stake',
  'The Contrarian',
  'The Visual Bridge',
  'The Direct Payoff',
] as const

type HookPattern = (typeof hookPatterns)[number]

interface HookCard {
  id: string
  badge: 'ENGAGEMENT HIGH' | 'VIRAL PATTERN'
  badgeColor: string
  text: string
  engagementPotential: number
  retentionRisk: 'Low' | 'Medium' | 'High'
  pattern: HookPattern
}

const mockHooks: HookCard[] = [
  {
    id: '1',
    badge: 'ENGAGEMENT HIGH',
    badgeColor: 'var(--ip-hook-question)',
    text: '"Why 99% of creators fail before reaching 1,000 followers (and it\'s not the algorithm)."',
    engagementPotential: 94,
    retentionRisk: 'Low',
    pattern: 'The Question',
  },
  {
    id: '2',
    badge: 'VIRAL PATTERN',
    badgeColor: 'var(--ip-hook-contrarian)',
    text: '"If you want to grow fast, stop posting daily. Here is the \'Ghost Strategy\' I use instead."',
    engagementPotential: 88,
    retentionRisk: 'Medium',
    pattern: 'The Contrarian',
  },
  {
    id: '3',
    badge: 'ENGAGEMENT HIGH',
    badgeColor: 'var(--ip-hook-stat)',
    text: '"98% of people scroll past your content before you even speak. Here\'s how to fix that in 3 seconds."',
    engagementPotential: 91,
    retentionRisk: 'Low',
    pattern: 'The Stat',
  },
  {
    id: '4',
    badge: 'VIRAL PATTERN',
    badgeColor: 'var(--ip-hook-negative-stake)',
    text: '"You\'re losing 80% of your audience in the first 2 seconds. This is what\'s actually killing your reach."',
    engagementPotential: 86,
    retentionRisk: 'Medium',
    pattern: 'The Negative Stake',
  },
]

const swipeLibrary = [
  { text: '"The 3-second rule for viral videos..."', successRate: 92 },
  { text: '"Nobody is talking about this AI hack..."', successRate: 78 },
  { text: '"How I turned $0 into $10k with..."', successRate: 85 },
  { text: '"Your morning routine is actually..."', successRate: 68 },
]

function getRiskColor(risk: 'Low' | 'Medium' | 'High') {
  switch (risk) {
    case 'Low':
      return 'var(--ip-success)'
    case 'Medium':
      return 'var(--ip-warning)'
    case 'High':
      return 'var(--ip-error)'
  }
}

export function Hooks() {
  const [activePattern, setActivePattern] = useState<HookPattern | 'All'>('All')

  const filteredHooks =
    activePattern === 'All'
      ? mockHooks
      : mockHooks.filter((h) => h.pattern === activePattern)

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
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

        {/* Filter Tabs — pill-shaped toggles */}
        <div className="flex flex-wrap gap-2 mb-6">
          {hookPatterns.map((pattern) => (
            <button
              key={pattern}
              onClick={() => setActivePattern(activePattern === pattern ? 'All' : pattern)}
              className="px-4 py-2 text-sm font-medium transition-all"
              style={{
                borderRadius: 'var(--ip-radius-full)',
                background:
                  activePattern === pattern ? 'var(--ip-primary-gradient)' : 'transparent',
                color: activePattern === pattern ? 'var(--ip-text-on-primary)' : 'var(--ip-text)',
                border:
                  activePattern === pattern
                    ? '1px solid transparent'
                    : '1px solid var(--ip-border)',
                boxShadow: activePattern === pattern ? 'var(--ip-shadow-sm)' : 'none',
              }}
            >
              {pattern}
            </button>
          ))}
        </div>

        {/* Hook Cards */}
        <div className="space-y-5">
          {filteredHooks.map((hook) => (
            <div
              key={hook.id}
              className="p-6 transition-all hover:translate-y-[-1px]"
              style={{
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: 'var(--ip-radius-lg)',
                boxShadow: 'var(--ip-shadow-md)',
                border: '1px solid var(--ip-border-subtle)',
              }}
            >
              {/* Badge + Actions */}
              <div className="flex items-center justify-between mb-4">
                <span
                  className="px-3 py-1 text-[10px] font-bold tracking-wider uppercase"
                  style={{
                    background: hook.badgeColor,
                    color: 'white',
                    borderRadius: 'var(--ip-radius-full)',
                  }}
                >
                  {hook.badge}
                </span>
                <button className="p-1 rounded hover:bg-[var(--ip-bg-subtle)]">
                  <MoreVertical size={16} style={{ color: 'var(--ip-text-tertiary)' }} />
                </button>
              </div>

              {/* Hook Text — large serif-style display */}
              <p
                className="text-xl font-bold mb-6 leading-snug"
                style={{
                  fontFamily: 'var(--ip-font-display)',
                  color: 'var(--ip-text)',
                  fontStyle: 'italic',
                }}
              >
                {hook.text}
              </p>

              {/* Metrics Row */}
              <div className="flex items-end gap-8 mb-5">
                {/* Engagement Potential — horizontal bar with percentage */}
                <div className="flex-1">
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--ip-text-tertiary)' }}
                  >
                    Engagement Potential
                  </p>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-lg font-bold tabular-nums"
                      style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}
                    >
                      {hook.engagementPotential}%
                    </span>
                    <div
                      className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ background: 'var(--ip-border)' }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${hook.engagementPotential}%`,
                          background: 'var(--ip-primary-gradient)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Retention Risk — colored label */}
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--ip-text-tertiary)' }}
                  >
                    Retention Risk
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-bold"
                      style={{ color: getRiskColor(hook.retentionRisk) }}
                    >
                      {hook.retentionRisk}
                    </span>
                    <div
                      className="w-10 h-1 rounded-full"
                      style={{ background: getRiskColor(hook.retentionRisk) }}
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                {/* Add to Script — gradient pill */}
                <button
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{
                    background: 'var(--ip-primary-gradient)',
                    borderRadius: 'var(--ip-radius-full)',
                  }}
                >
                  <Plus size={16} />
                  Add to Script
                </button>
                {/* Refine AI — ghost button */}
                <button
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--ip-bg-subtle)]"
                  style={{
                    border: '1px solid var(--ip-border)',
                    borderRadius: 'var(--ip-radius-full)',
                    color: 'var(--ip-text-secondary)',
                    background: 'transparent',
                  }}
                >
                  <Sparkles size={16} />
                  Refine AI
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Sidebar: Swipe Library */}
      <div className="w-64 flex-shrink-0">
        <div
          className="sticky top-8 p-4"
          style={{
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 'var(--ip-radius-lg)',
            boxShadow: 'var(--ip-shadow-md)',
            border: '1px solid var(--ip-border-subtle)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-sm font-bold"
              style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
            >
              Swipe Library
            </h3>
            <BookmarkPlus size={16} style={{ color: 'var(--ip-text-tertiary)' }} />
          </div>

          <div className="space-y-3">
            {swipeLibrary.map((swipe, idx) => (
              <div
                key={idx}
                className="p-3 cursor-pointer transition-colors hover:bg-[var(--ip-bg-subtle)]"
                style={{
                  background: 'var(--ip-bg-subtle)',
                  borderRadius: 'var(--ip-radius-md)',
                  border: '1px solid var(--ip-border-subtle)',
                  borderLeft: '3px solid var(--ip-primary)',
                }}
              >
                <p
                  className="text-sm font-medium mb-1 leading-snug"
                  style={{ color: 'var(--ip-text)' }}
                >
                  {swipe.text}
                </p>
                <p
                  className="text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: 'var(--ip-text-tertiary)' }}
                >
                  SUCCESS RATE: {swipe.successRate}%
                </p>
              </div>
            ))}
          </div>

          <button
            className="w-full mt-4 py-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{
              color: 'var(--ip-text-brand)',
              borderRadius: 'var(--ip-radius-md)',
            }}
          >
            Explore All Swipes
          </button>

          {/* Upsell Banner */}
          <div
            className="mt-4 p-4 text-white"
            style={{
              background: 'linear-gradient(135deg, #1A1A2E 0%, #3D1C4F 100%)',
              borderRadius: 'var(--ip-radius-md)',
            }}
          >
            <p className="text-sm font-bold mb-1">New: Psychological Trigger Pack</p>
            <p className="text-xs opacity-80 mb-3">
              Unlock 50+ high-retention hook frames.
            </p>
            <button
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
      </div>
    </div>
  )
}
