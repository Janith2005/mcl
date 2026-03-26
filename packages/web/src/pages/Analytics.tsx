import { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Download,
  Eye,
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Settings,
} from 'lucide-react'

type TimeRange = '7 Days' | '30 Days' | 'All Time'

interface TopPerformer {
  id: string
  title: string
  publishedDate: string
  views: string
  viewsRaw: number
  trend: 'up' | 'down'
  trendLabel: string
  accentColor: string
  categoryLabel: string
  categoryColor: string
}

const topPerformers: TopPerformer[] = [
  {
    id: '1',
    title: 'The Myth of Viral Growth',
    publishedDate: 'Published 2 days ago',
    views: '142.5K',
    viewsRaw: 142500,
    trend: 'up',
    trendLabel: '+34% vs avg',
    accentColor: 'var(--ip-hook-question)',
    categoryLabel: 'TOP VIRAL',
    categoryColor: 'var(--ip-hook-question)',
  },
  {
    id: '2',
    title: '3 Hooks That Work',
    publishedDate: 'Published 5 days ago',
    views: '89.2K',
    viewsRaw: 89200,
    trend: 'down',
    trendLabel: '-9% vs avg',
    accentColor: 'var(--ip-hook-negative-stake)',
    categoryLabel: 'HIGH RETENTION',
    categoryColor: 'var(--ip-hook-negative-stake)',
  },
  {
    id: '3',
    title: 'Algorithm Secrets',
    publishedDate: 'Published 8 days ago',
    views: '214.0K',
    viewsRaw: 214000,
    trend: 'up',
    trendLabel: '+61% vs avg',
    accentColor: 'var(--ip-hook-contrarian)',
    categoryLabel: 'BRAIN PICK',
    categoryColor: 'var(--ip-hook-contrarian)',
  },
]

const hookPatternData = [
  { label: 'Question', avgView: 78, clickThrough: 62, color: 'var(--ip-hook-question)' },
  { label: 'Curiosity', avgView: 65, clickThrough: 48, color: 'var(--ip-hook-stat)' },
  { label: 'Expert', avgView: 52, clickThrough: 41, color: 'var(--ip-hook-negative-stake)' },
  { label: 'Story', avgView: 70, clickThrough: 55, color: 'var(--ip-hook-contrarian)' },
  { label: 'Direct', avgView: 45, clickThrough: 38, color: 'var(--ip-hook-visual-bridge)' },
  { label: 'Humor', avgView: 58, clickThrough: 44, color: 'var(--ip-hook-direct-payoff)' },
]

const pipelineStages = [
  { label: 'Concepts Identified', count: 64, total: 64, percent: 100, color: 'var(--ip-stage-publish)', pillLabel: '64 Concepts Identified' },
  { label: 'Scripted', count: 54, total: 64, percent: 84, color: 'var(--ip-stage-script)', pillLabel: '54 Drafts Approved' },
  { label: 'Production', count: 40, total: 64, percent: 62, color: 'var(--ip-hook-negative-stake)', pillLabel: '40 Content Filmed' },
]

const tacticalLog = [
  {
    title: 'Digital Leverage 101',
    subtitle: 'Day 1 - Published 1d ago',
    views: '10,402',
    engagement: '8.4%',
    feedback: 'Strong hook, weak CTA',
    avatar: '1',
  },
  {
    title: 'The Truth About Passive Income',
    subtitle: 'Day 3 - Published 3d ago',
    views: '45,890',
    engagement: '12.1%',
    feedback: 'Optimal storytelling',
    avatar: '2',
  },
]

/* Glassmorphic card style object */
const glassCard: React.CSSProperties = {
  background: 'var(--ip-card-glass-bg)',
  backdropFilter: 'blur(var(--ip-card-glass-blur))',
  borderRadius: 'var(--ip-radius-lg)',
  boxShadow: 'var(--ip-card-glass-shadow)',
  border: '1px solid var(--ip-card-glass-border)',
}

/* Mini sparkline SVG for performer cards */
function MiniSparkline({ color }: { color: string }) {
  return (
    <svg width="48" height="24" viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M2 18 L10 14 L18 16 L26 8 L34 10 L42 4 L46 6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M2 18 L10 14 L18 16 L26 8 L34 10 L42 4 L46 6 L46 24 L2 24Z"
        fill={color}
        fillOpacity="0.1"
      />
    </svg>
  )
}

export function Analytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30 Days')
  const timeRanges: TimeRange[] = ['7 Days', '30 Days', 'All Time']

  const maxBarHeight = 120

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
          >
            Performance Intelligence
          </h1>
          <p className="text-sm" style={{ color: 'var(--ip-text-secondary)' }}>
            Real-time engagement metrics and algorithmic feedback.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Range Tabs */}
          <div
            className="flex p-1"
            style={{
              background: 'var(--ip-bg-subtle)',
              borderRadius: 'var(--ip-radius-full)',
            }}
          >
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className="px-4 py-1.5 text-xs font-medium transition-all"
                style={{
                  borderRadius: 'var(--ip-radius-full)',
                  background: timeRange === range ? 'var(--ip-surface)' : 'transparent',
                  color: timeRange === range ? 'var(--ip-text)' : 'var(--ip-text-tertiary)',
                  boxShadow: timeRange === range ? 'var(--ip-shadow-sm)' : 'none',
                }}
              >
                {range}
              </button>
            ))}
          </div>
          {/* Export Button */}
          <button
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{
              background: 'var(--ip-primary-gradient)',
              borderRadius: 'var(--ip-radius-full)',
            }}
          >
            <Download size={14} />
            Export Report
          </button>

          {/* Bell + Settings + Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--ip-bg-subtle)', color: 'var(--ip-text-tertiary)' }}
          >
            <Bell size={16} />
          </div>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--ip-bg-subtle)', color: 'var(--ip-text-tertiary)' }}
          >
            <Settings size={16} />
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'var(--ip-primary-gradient)' }}
            >
              CF
            </div>
            <div className="hidden xl:block">
              <p className="text-xs font-semibold" style={{ color: 'var(--ip-text)' }}>Cap'n Flint</p>
              <p className="text-[10px]" style={{ color: 'var(--ip-text-tertiary)' }}>Pro Plan</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex gap-6">
        {/* Left Column */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Top Performer Cards */}
          <div className="grid grid-cols-3 gap-4">
            {topPerformers.map((perf) => (
              <div
                key={perf.id}
                className="p-5 transition-shadow hover:shadow-md"
                style={{
                  ...glassCard,
                  borderTop: `3px solid ${perf.accentColor}`,
                }}
              >
                {/* Category Badge */}
                <span
                  className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2"
                  style={{
                    color: perf.categoryColor,
                    background: `color-mix(in srgb, ${perf.categoryColor} 12%, transparent)`,
                    borderRadius: 'var(--ip-radius-full)',
                  }}
                >
                  {perf.categoryLabel}
                </span>

                <h3
                  className="text-sm font-bold mb-1"
                  style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
                >
                  {perf.title}
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--ip-text-tertiary)' }}>
                  {perf.publishedDate}
                </p>

                <div className="flex items-end justify-between">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <Eye size={12} style={{ color: 'var(--ip-text-tertiary)' }} />
                      <span className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
                        Views
                      </span>
                    </div>
                    <span
                      className="text-2xl font-bold"
                      style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
                    >
                      {perf.views}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <MiniSparkline color={perf.accentColor} />
                    <div className="flex items-center gap-1">
                      {perf.trend === 'up' ? (
                        <TrendingUp size={14} style={{ color: 'var(--ip-success)' }} />
                      ) : (
                        <TrendingDown size={14} style={{ color: 'var(--ip-error)' }} />
                      )}
                      <span
                        className="text-xs font-medium"
                        style={{ color: perf.trend === 'up' ? 'var(--ip-success)' : 'var(--ip-error)' }}
                      >
                        {perf.trendLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Hook Pattern Performance */}
          <div className="p-6" style={glassCard}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3
                  className="text-lg font-bold"
                  style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
                >
                  Hook Pattern Performance
                </h3>
                <p className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
                  Comparison of engagement rates across 6 tactical hook types
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--ip-primary)' }} />
                  <span className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
                    AVG VIEW DURATION
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ background: 'var(--ip-primary)', opacity: 0.4 }}
                  />
                  <span className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
                    CLICK THROUGH
                  </span>
                </div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="flex items-end justify-between gap-3" style={{ height: maxBarHeight + 40 }}>
              {hookPatternData.map((pattern) => (
                <div key={pattern.label} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="flex items-end gap-1 w-full justify-center"
                    style={{ height: maxBarHeight }}
                  >
                    {/* Avg View Bar */}
                    <div
                      className="w-5 rounded-t transition-all"
                      style={{
                        height: `${(pattern.avgView / 100) * maxBarHeight}px`,
                        background: pattern.color,
                      }}
                    />
                    {/* Click Through Bar */}
                    <div
                      className="w-5 rounded-t transition-all"
                      style={{
                        height: `${(pattern.clickThrough / 100) * maxBarHeight}px`,
                        background: pattern.color,
                        opacity: 0.4,
                      }}
                    />
                  </div>
                  <span
                    className="text-[10px] font-medium mt-2 text-center uppercase"
                    style={{ color: 'var(--ip-text-tertiary)' }}
                  >
                    {pattern.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Storage Utilization + Tactical Log row */}
          <div className="flex gap-4">
            {/* Storage Utilization */}
            <div
              className="p-4 w-56 flex-shrink-0"
              style={glassCard}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-wider mb-2"
                style={{ color: 'var(--ip-text-tertiary)' }}
              >
                Storage Utilization
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className="text-lg font-bold"
                  style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
                >
                  14.2 GB
                </span>
                <span className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
                  / 50 GB available
                </span>
              </div>
              <div
                className="w-full h-2 rounded-full overflow-hidden mt-2"
                style={{ background: 'var(--ip-border)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: '28%',
                    background: 'var(--ip-primary-gradient)',
                  }}
                />
              </div>
            </div>

            {/* Tactical Log */}
            <div className="flex-1 p-6" style={glassCard}>
              <div className="flex items-center justify-between mb-4">
                <h3
                  className="text-lg font-bold"
                  style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
                >
                  Tactical Log
                </h3>
                <button
                  className="flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--ip-text-brand)' }}
                >
                  View Full Archive
                  <ArrowUpRight size={12} />
                </button>
              </div>

              {/* Table Header */}
              <div
                className="grid grid-cols-12 gap-4 pb-3 mb-3 text-xs font-medium uppercase tracking-wider"
                style={{
                  color: 'var(--ip-text-tertiary)',
                  borderBottom: '1px solid var(--ip-border-subtle)',
                }}
              >
                <div className="col-span-4">Post Insight</div>
                <div className="col-span-2">Views</div>
                <div className="col-span-2">Engagement</div>
                <div className="col-span-4">Brain Feedback</div>
              </div>

              {/* Table Rows */}
              {tacticalLog.map((row, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-4 py-3 items-center transition-colors hover:bg-[var(--ip-bg-subtle)]"
                  style={{
                    borderBottom: idx < tacticalLog.length - 1 ? '1px solid var(--ip-border-subtle)' : 'none',
                    borderRadius: 'var(--ip-radius-sm)',
                  }}
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                      style={{ background: 'var(--ip-primary-gradient)' }}
                    >
                      {row.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--ip-text)' }}>
                        {row.title}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
                        {row.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--ip-text)' }}>
                      {row.views}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--ip-text)' }}>
                      {row.engagement}
                    </span>
                  </div>
                  <div className="col-span-4">
                    <span
                      className="text-xs px-3 py-1 inline-block"
                      style={{
                        background: 'var(--ip-bg-subtle)',
                        borderRadius: 'var(--ip-radius-full)',
                        color: 'var(--ip-text-secondary)',
                      }}
                    >
                      {row.feedback}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Pipeline Health */}
        <div className="w-72 flex-shrink-0 space-y-6">
          {/* Pipeline Health Card */}
          <div className="p-5" style={glassCard}>
            <h3
              className="text-sm font-bold mb-1"
              style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
            >
              Pipeline Health
            </h3>
            <p className="text-xs mb-5" style={{ color: 'var(--ip-text-tertiary)' }}>
              Efficiency from concept to distribution
            </p>

            <div className="space-y-4">
              {pipelineStages.map((stage) => (
                <div key={stage.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--ip-text-secondary)' }}>
                      {stage.label.toUpperCase()}
                    </span>
                    <span
                      className="text-xs font-bold"
                      style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}
                    >
                      {stage.percent}%
                    </span>
                  </div>
                  <div
                    className="w-full h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--ip-border)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${stage.percent}%`,
                        background: stage.color,
                      }}
                    />
                  </div>
                  <div className="mt-1">
                    <span
                      className="inline-block px-2 py-0.5 text-[10px] font-medium text-white"
                      style={{
                        background: stage.color,
                        borderRadius: 'var(--ip-radius-full)',
                      }}
                    >
                      {stage.pillLabel}
                    </span>
                  </div>
                </div>
              ))}

              {/* Live Assets */}
              <div className="pt-2">
                <span
                  className="inline-block px-3 py-1.5 text-xs font-bold text-white"
                  style={{
                    background: 'var(--ip-success)',
                    borderRadius: 'var(--ip-radius-full)',
                  }}
                >
                  24 Live Assets
                </span>
              </div>
            </div>
          </div>

          {/* Bottleneck Alert */}
          <div
            className="p-4 flex items-start gap-3"
            style={{
              ...glassCard,
              borderLeft: '3px solid var(--ip-warning)',
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(245, 158, 11, 0.12)' }}
            >
              <AlertTriangle size={16} style={{ color: 'var(--ip-warning)' }} />
            </div>
            <div>
              <p className="text-xs font-bold mb-1" style={{ color: 'var(--ip-error)' }}>
                Bottleneck Alert
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ip-text-secondary)' }}>
                Production is lagging 19.5 days behind Scripting. Consider filming batches.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
