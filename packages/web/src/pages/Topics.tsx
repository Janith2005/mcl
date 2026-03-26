import { useState } from 'react'
import { MoreHorizontal, Plus, ArrowUpRight, Clock, TrendingUp } from 'lucide-react'

type ViewMode = 'kanban' | 'table'

interface TopicCard {
  id: string
  category: string
  categoryColor: string
  title: string
  score: number
  source?: string
  platform?: string
  tags: string[]
  pillars?: string[]
  engagement?: string
  timestamp: string
  column: 'discovered' | 'scored'
}

const MOCK_TOPICS: TopicCard[] = [
  {
    id: '1',
    category: 'TECH TRENDS',
    categoryColor: 'var(--ip-stage-discover)',
    title: 'AI Agent Overlords: The 2024 Reality',
    score: 96,
    source: '#AI',
    platform: '#FutureTech',
    tags: [],
    pillars: ['AI', '#FutureTech'],
    timestamp: 'posted 21 ago',
    column: 'discovered',
  },
  {
    id: '2',
    category: 'LIFESTYLE',
    categoryColor: 'var(--ip-stage-publish)',
    title: 'Minimalism is Dead: Long Live "Cluttercore"',
    score: 94,
    tags: ['Viral Spike', '#Design'],
    pillars: ['Viral Spike', '#Design'],
    engagement: '+12.4% Momentum',
    timestamp: 'posted 21 ago',
    column: 'scored',
  },
  {
    id: '3',
    category: 'FINANCE',
    categoryColor: 'var(--ip-stage-hook)',
    title: 'The Invisible Economy of Ghost Kitchens',
    score: 72,
    platform: '#Business',
    tags: [],
    pillars: ['#Business'],
    source: 'New Source: Reddit',
    timestamp: 'posted 55 ago',
    column: 'discovered',
  },
]

function getScoreColor(score: number): string {
  if (score >= 90) return 'var(--ip-score-perfect)'
  if (score >= 75) return 'var(--ip-score-strong)'
  if (score >= 60) return 'var(--ip-score-good)'
  if (score >= 40) return 'var(--ip-score-below)'
  return 'var(--ip-score-low)'
}

function getScoreBg(score: number): string {
  if (score >= 90) return 'rgba(212, 175, 55, 0.12)'
  if (score >= 75) return 'rgba(16, 185, 129, 0.12)'
  if (score >= 60) return 'rgba(59, 130, 246, 0.12)'
  if (score >= 40) return 'rgba(245, 158, 11, 0.12)'
  return 'rgba(239, 68, 68, 0.12)'
}

function TopicCardComponent({ topic }: { topic: TopicCard }) {
  return (
    <div
      className="p-5 mb-4 transition-all hover:translate-y-[-2px]"
      style={{
        background: 'var(--ip-card-glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 'var(--ip-radius-lg)',
        boxShadow: 'var(--ip-shadow-md)',
        border: '1px solid var(--ip-border-subtle)',
      }}
    >
      {/* Category label (muted uppercase) + Score pill (top-right) */}
      <div className="flex items-start justify-between mb-3">
        <span
          className="text-[10px] font-bold tracking-widest uppercase"
          style={{
            color: topic.categoryColor,
          }}
        >
          {topic.category}
        </span>
        <span
          className="text-[11px] font-bold px-2 py-0.5 flex items-center gap-1"
          style={{
            color: getScoreColor(topic.score),
            background: getScoreBg(topic.score),
            borderRadius: 'var(--ip-radius-full)',
          }}
        >
          <TrendingUp size={10} />
          {topic.score}
        </span>
      </div>

      {/* Title */}
      <h4
        className="text-sm font-semibold mb-3 leading-snug"
        style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}
      >
        {topic.title}
      </h4>

      {/* Pillar tags as small rounded pills */}
      {topic.pillars && topic.pillars.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {topic.pillars.map((pillar) => (
            <span
              key={pillar}
              className="text-[10px] font-medium px-2.5 py-0.5"
              style={{
                background: 'var(--ip-bg-subtle)',
                color: 'var(--ip-text-secondary)',
                borderRadius: 'var(--ip-radius-full)',
                border: '1px solid var(--ip-border-subtle)',
              }}
            >
              {pillar}
            </span>
          ))}
        </div>
      )}

      {/* Engagement */}
      {topic.engagement && (
        <div className="flex items-center gap-1 mb-2">
          <ArrowUpRight size={11} style={{ color: 'var(--ip-success)' }} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--ip-success)' }}>
            {topic.engagement}
          </span>
        </div>
      )}

      {/* Source + Timestamp */}
      <div className="flex items-center gap-2 mt-3">
        {topic.source && (
          <span className="text-[11px]" style={{ color: 'var(--ip-text-tertiary)' }}>
            {topic.source}
          </span>
        )}
        <div className="flex items-center gap-1">
          <Clock size={10} style={{ color: 'var(--ip-text-tertiary)' }} />
          <span className="text-[10px]" style={{ color: 'var(--ip-text-tertiary)' }}>
            {topic.timestamp}
          </span>
        </div>
      </div>
    </div>
  )
}

export function Topics() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')

  const discoveredTopics = MOCK_TOPICS.filter((t) => t.column === 'discovered')
  const scoredTopics = MOCK_TOPICS.filter((t) => t.column === 'scored')

  return (
    <div>
      {/* Top Header Bar */}
      <div className="flex items-center gap-6 mb-6">
        <span
          className="text-lg font-bold"
          style={{
            fontFamily: 'var(--ip-font-display)',
            background: 'var(--ip-primary-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Influence Pirates
        </span>
        <h1
          className="text-xl font-bold"
          style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
        >
          Topic Laboratory
        </h1>
      </div>

      {/* View Toggle + Badge */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="flex items-center p-1"
          style={{
            background: 'var(--ip-bg-subtle)',
            borderRadius: 'var(--ip-radius-full)',
            border: '1px solid var(--ip-border-subtle)',
          }}
        >
          <button
            onClick={() => setViewMode('kanban')}
            className="px-4 py-1.5 text-xs font-medium transition-all"
            style={{
              borderRadius: 'var(--ip-radius-full)',
              background: viewMode === 'kanban' ? 'var(--ip-surface)' : 'transparent',
              color: viewMode === 'kanban' ? 'var(--ip-text)' : 'var(--ip-text-tertiary)',
              boxShadow: viewMode === 'kanban' ? 'var(--ip-shadow-sm)' : 'none',
            }}
          >
            Kanban
          </button>
          <button
            onClick={() => setViewMode('table')}
            className="px-4 py-1.5 text-xs font-medium transition-all"
            style={{
              borderRadius: 'var(--ip-radius-full)',
              background: viewMode === 'table' ? 'var(--ip-surface)' : 'transparent',
              color: viewMode === 'table' ? 'var(--ip-text)' : 'var(--ip-text-tertiary)',
              boxShadow: viewMode === 'table' ? 'var(--ip-shadow-sm)' : 'none',
            }}
          >
            Table
          </button>
        </div>

        <span
          className="text-xs font-medium px-3 py-1.5"
          style={{
            background: 'var(--ip-bg-subtle)',
            color: 'var(--ip-text-secondary)',
            borderRadius: 'var(--ip-radius-full)',
            border: '1px solid var(--ip-border-subtle)',
          }}
        >
          12 New Topics found today
        </span>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-2 gap-8">
          {/* Discovered Column */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}
                >
                  Discovered
                </h3>
                <button
                  className="w-5 h-5 flex items-center justify-center"
                  style={{
                    background: 'var(--ip-bg-subtle)',
                    borderRadius: 'var(--ip-radius-full)',
                    color: 'var(--ip-text-tertiary)',
                  }}
                >
                  <Plus size={12} />
                </button>
              </div>
              <button className="p-1 hover:bg-[var(--ip-bg-subtle)]" style={{ borderRadius: 'var(--ip-radius-sm)' }}>
                <MoreHorizontal size={14} style={{ color: 'var(--ip-text-tertiary)' }} />
              </button>
            </div>
            {discoveredTopics.map((topic) => (
              <TopicCardComponent key={topic.id} topic={topic} />
            ))}
          </div>

          {/* Scored Column */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3
                  className="text-sm font-semibold"
                  style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}
                >
                  Scored
                </h3>
                <span
                  className="text-[10px] font-medium px-1.5 py-0.5"
                  style={{
                    background: 'var(--ip-bg-subtle)',
                    color: 'var(--ip-text-tertiary)',
                    borderRadius: 'var(--ip-radius-full)',
                  }}
                >
                  2
                </span>
              </div>
              <button className="p-1 hover:bg-[var(--ip-bg-subtle)]" style={{ borderRadius: 'var(--ip-radius-sm)' }}>
                <MoreHorizontal size={14} style={{ color: 'var(--ip-text-tertiary)' }} />
              </button>
            </div>
            {scoredTopics.map((topic) => (
              <TopicCardComponent key={topic.id} topic={topic} />
            ))}
          </div>
        </div>
      )}

      {/* Table View (placeholder) */}
      {viewMode === 'table' && (
        <div
          className="p-6"
          style={{
            background: 'var(--ip-card-glass-bg)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 'var(--ip-radius-lg)',
            border: '1px solid var(--ip-border-subtle)',
            boxShadow: 'var(--ip-shadow-md)',
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ip-border-subtle)' }}>
                <th className="text-left py-3 px-2 text-xs font-semibold" style={{ color: 'var(--ip-text-tertiary)' }}>
                  TOPIC
                </th>
                <th className="text-left py-3 px-2 text-xs font-semibold" style={{ color: 'var(--ip-text-tertiary)' }}>
                  CATEGORY
                </th>
                <th className="text-left py-3 px-2 text-xs font-semibold" style={{ color: 'var(--ip-text-tertiary)' }}>
                  SCORE
                </th>
                <th className="text-left py-3 px-2 text-xs font-semibold" style={{ color: 'var(--ip-text-tertiary)' }}>
                  STATUS
                </th>
                <th className="text-left py-3 px-2 text-xs font-semibold" style={{ color: 'var(--ip-text-tertiary)' }}>
                  TIMESTAMP
                </th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TOPICS.map((topic) => (
                <tr
                  key={topic.id}
                  className="transition-colors hover:bg-[var(--ip-bg-subtle)]"
                  style={{ borderBottom: '1px solid var(--ip-border-subtle)' }}
                >
                  <td className="py-3 px-2 font-medium" style={{ color: 'var(--ip-text)' }}>
                    {topic.title}
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className="text-[10px] font-bold tracking-widest px-2 py-0.5"
                      style={{
                        color: topic.categoryColor,
                        background: `color-mix(in srgb, ${topic.categoryColor} 12%, transparent)`,
                        borderRadius: 'var(--ip-radius-full)',
                      }}
                    >
                      {topic.category}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5"
                      style={{
                        color: getScoreColor(topic.score),
                        background: getScoreBg(topic.score),
                        borderRadius: 'var(--ip-radius-full)',
                      }}
                    >
                      {topic.score}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-xs capitalize" style={{ color: 'var(--ip-text-secondary)' }}>
                    {topic.column}
                  </td>
                  <td className="py-3 px-2 text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
                    {topic.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
