import {
  Zap,
  Flame,
  FileText,
  AlertTriangle,
  Sparkles,
  Search,
  BarChart3,
  PenTool,
  ChevronRight,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Static data — replace with API calls                               */
/* ------------------------------------------------------------------ */

const PIPELINE_STAGES = [
  { label: 'Discover', count: 124, color: 'var(--ip-stage-discover)' },
  { label: 'Angle', count: 86, color: 'var(--ip-stage-angle)' },
  { label: 'Hook', count: 42, color: 'var(--ip-stage-hook)' },
  { label: 'Script', count: 18, color: 'var(--ip-stage-script)' },
  { label: 'Publish', count: 7, color: 'var(--ip-stage-publish)' },
] as const

const FEED_ITEMS = [
  {
    icon: Zap,
    iconBg: 'var(--ip-stage-hook)',
    title: 'New hook generated for "Retention Drops"',
    meta: '10 minutes ago  ·  AI Agent',
  },
  {
    icon: BarChart3,
    iconBg: 'var(--ip-stage-angle)',
    title: 'Competitor report ready: @rivalcreator',
    meta: '2 hours ago  ·  System',
  },
  {
    icon: AlertTriangle,
    iconBg: 'var(--ip-error)',
    title: 'Alert: High churn detected in Wellness niche',
    meta: '4 hours ago  ·  Analytics',
  },
] as const

const QUICK_ACTIONS = [
  { icon: Search, label: 'Discover Topics' },
  { icon: PenTool, label: 'Generate Hook' },
  { icon: FileText, label: 'Draft Script' },
  { icon: BarChart3, label: 'View Analytics' },
] as const

/* ------------------------------------------------------------------ */
/*  Shared style objects                                               */
/* ------------------------------------------------------------------ */

const cardStyle: React.CSSProperties = {
  background: 'var(--ip-surface-glass)',
  backdropFilter: 'blur(var(--ip-glass-blur))',
  borderRadius: 'var(--ip-radius-lg)',
  boxShadow: 'var(--ip-shadow-md)',
  border: '1px solid var(--ip-border-subtle)',
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function WorkspaceTabs() {
  const tabs = ['Workspaces', 'Team', 'API']
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            className="px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              fontFamily: 'var(--ip-font-body)',
              color: i === 0 ? 'var(--ip-primary)' : 'var(--ip-text-tertiary)',
              borderBottom: i === 0 ? '2px solid var(--ip-primary)' : '2px solid transparent',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      {/* Search bar */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-sm"
        style={{
          background: 'var(--ip-surface-glass)',
          backdropFilter: 'blur(var(--ip-glass-blur))',
          border: '1px solid var(--ip-border-subtle)',
          borderRadius: 'var(--ip-radius-full)',
          color: 'var(--ip-text-tertiary)',
          fontFamily: 'var(--ip-font-body)',
          minWidth: 200,
        }}
      >
        <Search size={14} />
        <span className="text-xs">
          <span style={{ color: 'var(--ip-text-tertiary)', opacity: 0.7 }}>CMD + K</span>{' '}
          TO SEARCH
        </span>
      </div>
    </div>
  )
}

function PipelineFunnel() {
  return (
    <div
      className="p-6"
      style={cardStyle}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles size={14} style={{ color: 'var(--ip-primary)' }} />
          <span
            className="text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'var(--ip-primary)', fontFamily: 'var(--ip-font-body)' }}
          >
            Content Pipeline Funnel
          </span>
        </div>
        <span
          className="text-xs"
          style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}
        >
          Last 14h velocity
        </span>
      </div>

      {/* Sparkline placeholder */}
      <div className="flex items-end gap-1 mb-6 h-16 px-2">
        {[35, 42, 28, 55, 48, 60, 72, 65, 50, 80, 70, 85, 78, 92].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all"
            style={{
              height: `${h}%`,
              background: i >= 12
                ? 'var(--ip-primary-gradient)'
                : 'var(--ip-border-subtle)',
              opacity: i >= 12 ? 1 : 0.5,
            }}
          />
        ))}
        <span
          className="text-xs font-semibold ml-2"
          style={{ color: 'var(--ip-success)', fontFamily: 'var(--ip-font-body)' }}
        >
          +42%
        </span>
      </div>

      {/* Stage pills with connecting arrows */}
      <div className="flex items-center gap-2">
        {PIPELINE_STAGES.map((stage, i) => (
          <div key={stage.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className="w-full py-3 flex items-center justify-center font-bold text-white text-base"
                style={{
                  background: stage.color,
                  borderRadius: 'var(--ip-radius-full)',
                  fontFamily: 'var(--ip-font-display)',
                  boxShadow: `0 4px 12px color-mix(in srgb, ${stage.color} 30%, transparent)`,
                }}
              >
                {stage.count}
              </div>
              <span
                className="text-[10px] font-medium uppercase tracking-wider"
                style={{
                  color: 'var(--ip-text-tertiary)',
                  fontFamily: 'var(--ip-font-body)',
                }}
              >
                {stage.label}
              </span>
            </div>
            {i < PIPELINE_STAGES.length - 1 && (
              <ChevronRight
                size={16}
                className="shrink-0 mx-1"
                style={{ color: 'var(--ip-border)' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TopPerformer() {
  return (
    <div style={cardStyle} className="overflow-hidden">
      {/* Section header */}
      <div className="px-6 pt-5 pb-3">
        <span
          className="text-[10px] font-semibold tracking-widest uppercase"
          style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}
        >
          Top Performer
        </span>
      </div>

      {/* Thumbnail */}
      <div
        className="relative mx-4 overflow-hidden"
        style={{ borderRadius: 'var(--ip-radius-md)', height: 180 }}
      >
        {/* Placeholder gradient mimicking the design's golden-wave thumbnail */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(145deg, #1a1008 0%, #4a3520 30%, #8b6914 60%, #d4af37 100%)',
          }}
        />
        {/* Viral Potential badge */}
        <div
          className="absolute bottom-3 left-3 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{
            background: 'var(--ip-success)',
            borderRadius: 'var(--ip-radius-full)',
            fontFamily: 'var(--ip-font-body)',
          }}
        >
          Viral Potential
        </div>
        {/* Duration badge */}
        <div
          className="absolute bottom-3 right-3 px-2 py-0.5 text-[10px] font-medium text-white"
          style={{
            background: 'rgba(0,0,0,0.6)',
            borderRadius: 'var(--ip-radius-sm)',
            fontFamily: 'var(--ip-font-body)',
          }}
        >
          00:58
        </div>
      </div>

      {/* Title */}
      <div className="px-6 pt-4">
        <h3
          className="text-lg font-bold"
          style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
        >
          The Anti-Guru Angle
        </h3>
      </div>

      {/* Stats row */}
      <div className="flex gap-8 px-6 pt-4 pb-2">
        <div>
          <p
            className="text-[10px] font-medium uppercase tracking-wider mb-0.5"
            style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}
          >
            Total Views
          </p>
          <p
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
          >
            12,492
          </p>
        </div>
        <div>
          <p
            className="text-[10px] font-medium uppercase tracking-wider mb-0.5"
            style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}
          >
            Conv Rate
          </p>
          <p
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
          >
            8.2%
          </p>
        </div>
      </div>

      {/* Why it won */}
      <div className="px-6 pb-5 pt-2">
        <div className="flex items-start gap-2">
          <Flame size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--ip-error)' }} />
          <div>
            <span
              className="text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--ip-error)', fontFamily: 'var(--ip-font-body)' }}
            >
              Why it won
            </span>
            <p
              className="text-xs mt-0.5 leading-relaxed"
              style={{ color: 'var(--ip-text-secondary)', fontFamily: 'var(--ip-font-body)' }}
            >
              "Contrarian Hook: Leveraged 'Negative Credibility' to break typical pattern
              recognition in the first 1.5s."
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function TacticalFeed() {
  return (
    <div className="p-6" style={cardStyle}>
      <div className="flex items-center justify-between mb-5">
        <span
          className="text-[10px] font-semibold tracking-widest uppercase"
          style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}
        >
          Tactical Feed
        </span>
      </div>

      <div className="flex flex-col gap-4">
        {FEED_ITEMS.map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `color-mix(in srgb, ${item.iconBg} 15%, transparent)` }}
              >
                <Icon size={16} style={{ color: item.iconBg }} />
              </div>
              <div className="min-w-0">
                <p
                  className="text-sm font-medium leading-snug truncate"
                  style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-body)' }}
                >
                  {item.title}
                </p>
                <p
                  className="text-[11px] mt-0.5"
                  style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}
                >
                  {item.meta}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuickActions() {
  return (
    <div className="p-6" style={cardStyle}>
      <span
        className="text-[10px] font-semibold tracking-widest uppercase block mb-4"
        style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}
      >
        Quick Actions
      </span>

      <div className="grid grid-cols-2 gap-3">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              className="flex items-center gap-2.5 px-4 py-3 text-sm font-medium transition-all hover:scale-[1.02]"
              style={{
                background: 'transparent',
                borderRadius: 'var(--ip-radius-md)',
                border: '1px solid var(--ip-border-subtle)',
                color: 'var(--ip-text-secondary)',
                fontFamily: 'var(--ip-font-body)',
              }}
            >
              <Icon size={16} style={{ color: 'var(--ip-text-tertiary)' }} />
              {action.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Dashboard — main export                                            */
/* ------------------------------------------------------------------ */

export function Dashboard() {
  return (
    <div className="max-w-full">
      {/* Header area */}
      <header className="mb-8">
        <WorkspaceTabs />
        <div className="mt-4">
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
          >
            Vessel Command
          </h1>
          <p
            className="text-xs tracking-widest mt-1 uppercase"
            style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}
          >
            Global Operations Status for Agency Pro
          </p>
        </div>
      </header>

      {/* Pipeline Funnel — full width */}
      <section className="mb-8">
        <PipelineFunnel />
      </section>

      {/* Two-column layout: Top Performer | Tactical Feed + Quick Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column */}
        <TopPerformer />

        {/* Right column */}
        <div className="flex flex-col gap-8">
          <TacticalFeed />
          <QuickActions />
        </div>
      </section>
    </div>
  )
}
