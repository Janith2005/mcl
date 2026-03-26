import { useState } from 'react'
import { ArrowRightLeft, ArrowRight, Bookmark } from 'lucide-react'

type Tab = 'angles-lab' | 'drafts' | 'published'
type FormatTab = 'longform' | 'shortform' | 'linkedin-twitter'

interface AngleCard {
  id: string
  badge: string
  badgeColor: string
  badgeBg: string
  title: string
  description: string
  strengthLabel: string
  strengthLevel: 'high' | 'medium' | 'low'
  strengthPercent: number
}

const MOCK_ANGLES: AngleCard[] = [
  {
    id: '1',
    badge: 'THE REBEL',
    badgeColor: 'var(--ip-text-on-primary)',
    badgeBg: 'var(--ip-score-low)',
    title: 'Forget what you were told about seniority.',
    description:
      'Traditional career paths are dead. In the AI era, the \'Rebel\' uses tools to automate seniority, making years of experience irrelevant for those who dare to skip the queue.',
    strengthLabel: 'STRENGTH: HIGH',
    strengthLevel: 'high',
    strengthPercent: 85,
  },
  {
    id: '2',
    badge: 'THE EXPERT',
    badgeColor: 'var(--ip-text-on-primary)',
    badgeBg: 'var(--ip-stage-angle)',
    title: 'Precision over Volume: The AI Strategist.',
    description:
      "It's not about how much code you write, but the architectural decisions you enable. AI isn't the developer; it's the workforce, and you are the CEO.",
    strengthLabel: 'STRENGTH: MEDIUM',
    strengthLevel: 'medium',
    strengthPercent: 60,
  },
]

function getStrengthColor(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high') return 'var(--ip-success)'
  if (level === 'medium') return 'var(--ip-warning)'
  return 'var(--ip-error)'
}

export function Angles() {
  const [activeTab, setActiveTab] = useState<Tab>('angles-lab')
  const [formatTab, setFormatTab] = useState<FormatTab>('longform')
  const [commonBelief, setCommonBelief] = useState('')
  const [surprisingTruth, setSurprisingTruth] = useState('')

  const tabs: { id: Tab; label: string }[] = [
    { id: 'angles-lab', label: 'Angles Lab' },
    { id: 'drafts', label: 'Drafts' },
    { id: 'published', label: 'Published' },
  ]

  const formatTabs: { id: FormatTab; label: string }[] = [
    { id: 'longform', label: 'Longform' },
    { id: 'shortform', label: 'Shortform' },
    { id: 'linkedin-twitter', label: 'LinkedIn/Twitter' },
  ]

  function swapBeliefs() {
    const temp = commonBelief
    setCommonBelief(surprisingTruth)
    setSurprisingTruth(temp)
  }

  return (
    <div>
      {/* Active Focus Header */}
      <div className="mb-2">
        <p
          className="text-[10px] font-bold tracking-widest mb-1 uppercase"
          style={{ color: 'var(--ip-text-brand)' }}
        >
          ACTIVE FOCUS
        </p>
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
          >
            Niche Authority in AI
          </h1>
          <button
            className="px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{
              background: 'var(--ip-primary-gradient)',
              borderRadius: 'var(--ip-radius-full)',
            }}
          >
            Save Topic
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 mb-6" style={{ borderBottom: '1px solid var(--ip-border-subtle)' }}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: activeTab === id ? 'var(--ip-text-brand)' : 'var(--ip-text-tertiary)',
              borderBottom: activeTab === id ? '2px solid var(--ip-primary)' : '2px solid transparent',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'angles-lab' && (
        <>
          {/* Contrast Formula Section — glassmorphic card */}
          <div
            className="p-6 mb-6"
            style={{
              background: 'var(--ip-card-glass-bg)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 'var(--ip-radius-lg)',
              boxShadow: 'var(--ip-shadow-md)',
              border: '1px solid var(--ip-border-subtle)',
            }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Bookmark size={18} style={{ color: 'var(--ip-text)' }} />
              <h2
                className="text-base font-semibold"
                style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
              >
                The Contrast Formula
              </h2>
            </div>

            <div className="flex items-center gap-4">
              {/* Common Belief */}
              <div className="flex-1">
                <p
                  className="text-[10px] font-bold tracking-widest mb-2"
                  style={{ color: 'var(--ip-text-tertiary)' }}
                >
                  THE COMMON BELIEF (GOD)
                </p>
                <textarea
                  value={commonBelief}
                  onChange={(e) => setCommonBelief(e.target.value)}
                  placeholder="Ex: AI is a threat to junior developers' jobs..."
                  rows={3}
                  className="w-full text-sm p-3 outline-none resize-none"
                  style={{
                    background: 'var(--ip-bg-subtle)',
                    border: '1px solid var(--ip-border)',
                    borderRadius: 'var(--ip-radius-md)',
                    color: 'var(--ip-text)',
                  }}
                />
              </div>

              {/* Swap Icon */}
              <button
                onClick={swapBeliefs}
                className="flex-shrink-0 p-2.5 transition-colors hover:bg-[var(--ip-bg-subtle)]"
                style={{
                  borderRadius: 'var(--ip-radius-md)',
                  border: '1px solid var(--ip-border)',
                  color: 'var(--ip-text-secondary)',
                }}
                title="Swap beliefs"
              >
                <ArrowRightLeft size={18} />
              </button>

              {/* Surprising Truth */}
              <div className="flex-1">
                <p
                  className="text-[10px] font-bold tracking-widest mb-2"
                  style={{ color: 'var(--ip-text-tertiary)' }}
                >
                  THE SURPRISING TRUTH
                </p>
                <textarea
                  value={surprisingTruth}
                  onChange={(e) => setSurprisingTruth(e.target.value)}
                  placeholder="Ex: AI actually creates more opportunities for juniors..."
                  rows={3}
                  className="w-full text-sm p-3 outline-none resize-none"
                  style={{
                    background: 'var(--ip-bg-subtle)',
                    border: '1px solid var(--ip-border)',
                    borderRadius: 'var(--ip-radius-md)',
                    color: 'var(--ip-text)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Format Tabs — pill-shaped toggles */}
          <div
            className="inline-flex items-center p-1 mb-6"
            style={{
              background: 'var(--ip-bg-subtle)',
              borderRadius: 'var(--ip-radius-full)',
              border: '1px solid var(--ip-border-subtle)',
            }}
          >
            {formatTabs.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFormatTab(id)}
                className="px-4 py-2 text-sm font-medium transition-all"
                style={{
                  borderRadius: 'var(--ip-radius-full)',
                  background: formatTab === id ? 'var(--ip-surface)' : 'transparent',
                  color: formatTab === id ? 'var(--ip-text)' : 'var(--ip-text-tertiary)',
                  boxShadow: formatTab === id ? 'var(--ip-shadow-sm)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Angle Cards */}
          <div className="grid grid-cols-2 gap-6">
            {MOCK_ANGLES.map((angle) => (
              <div
                key={angle.id}
                className="p-5 transition-all hover:translate-y-[-2px]"
                style={{
                  background: 'var(--ip-card-glass-bg)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  borderRadius: 'var(--ip-radius-lg)',
                  boxShadow: 'var(--ip-shadow-md)',
                  border: '1px solid var(--ip-border-subtle)',
                }}
              >
                {/* Badge pill */}
                <span
                  className="inline-block text-[10px] font-bold tracking-widest px-3 py-1 mb-3"
                  style={{
                    color: angle.badgeColor,
                    background: angle.badgeBg,
                    borderRadius: 'var(--ip-radius-full)',
                  }}
                >
                  {angle.badge}
                </span>

                {/* Title */}
                <h3
                  className="text-base font-bold mb-2 leading-snug"
                  style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
                >
                  {angle.title}
                </h3>

                {/* Description */}
                <p
                  className="text-sm leading-relaxed mb-4"
                  style={{ color: 'var(--ip-text-secondary)' }}
                >
                  {angle.description}
                </p>

                {/* Contrast Strength progress bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-[10px] font-bold tracking-widest"
                      style={{ color: getStrengthColor(angle.strengthLevel) }}
                    >
                      {angle.strengthLabel}
                    </span>
                  </div>
                  <div
                    className="w-full h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--ip-border)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${angle.strengthPercent}%`,
                        background: getStrengthColor(angle.strengthLevel),
                      }}
                    />
                  </div>
                </div>

                {/* Edit Draft link */}
                <div className="flex items-center justify-end">
                  <button
                    className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
                    style={{ color: 'var(--ip-text-brand)' }}
                  >
                    Edit Draft <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'drafts' && (
        <div
          className="p-8 text-center"
          style={{
            background: 'var(--ip-card-glass-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 'var(--ip-radius-lg)',
            border: '1px solid var(--ip-border-subtle)',
            boxShadow: 'var(--ip-shadow-md)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--ip-text-tertiary)' }}>
            Your drafted angles will appear here once you start editing.
          </p>
        </div>
      )}

      {activeTab === 'published' && (
        <div
          className="p-8 text-center"
          style={{
            background: 'var(--ip-card-glass-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 'var(--ip-radius-lg)',
            border: '1px solid var(--ip-border-subtle)',
            boxShadow: 'var(--ip-shadow-md)',
          }}
        >
          <p className="text-sm" style={{ color: 'var(--ip-text-tertiary)' }}>
            Published angles will appear here after you finalize and ship content.
          </p>
        </div>
      )}
    </div>
  )
}
