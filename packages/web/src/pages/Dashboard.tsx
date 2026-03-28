import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth'
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
import { getDashboardStages, getDashboardFeed, getAnalytics } from '@/api/services'

/* ------------------------------------------------------------------ */
/*  Fallback static data (shown while API loads or on error)           */
/* ------------------------------------------------------------------ */

const FALLBACK_STAGES = [
  { label: 'Discover', count: 0, color: 'var(--ip-stage-discover)' },
  { label: 'Angle', count: 0, color: 'var(--ip-stage-angle)' },
  { label: 'Hook', count: 0, color: 'var(--ip-stage-hook)' },
  { label: 'Script', count: 0, color: 'var(--ip-stage-script)' },
  { label: 'Publish', count: 0, color: 'var(--ip-stage-publish)' },
]

const FALLBACK_FEED = [
  {
    id: '1',
    type: 'hook',
    title: 'Pipeline ready — start by discovering topics',
    created_at: new Date().toISOString(),
  },
]

/* ------------------------------------------------------------------ */
/*  Quick actions map                                                  */
/* ------------------------------------------------------------------ */

const QUICK_ACTIONS = [
  { icon: Search, label: 'Discover Topics', to: '/topics' },
  { icon: PenTool, label: 'Generate Hook', to: '/hooks' },
  { icon: FileText, label: 'Draft Script', to: '/scripts' },
  { icon: BarChart3, label: 'View Analytics', to: '/analytics' },
] as const

/* ------------------------------------------------------------------ */
/*  Shared style                                                       */
/* ------------------------------------------------------------------ */

const cardStyle: React.CSSProperties = {
  background: 'var(--ip-surface-glass)',
  backdropFilter: 'blur(var(--ip-glass-blur))',
  borderRadius: 'var(--ip-radius-lg)',
  boxShadow: 'var(--ip-shadow-md)',
  border: '1px solid var(--ip-border-subtle)',
}

/* ------------------------------------------------------------------ */
/*  Feed icon map                                                      */
/* ------------------------------------------------------------------ */

function feedIcon(type: string) {
  switch (type) {
    case 'hook': return { icon: Zap, color: 'var(--ip-stage-hook)' }
    case 'analytics': return { icon: BarChart3, color: 'var(--ip-stage-angle)' }
    case 'alert': return { icon: AlertTriangle, color: 'var(--ip-error)' }
    default: return { icon: Sparkles, color: 'var(--ip-primary)' }
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
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
  const { data } = useQuery({
    queryKey: ['dashboard-stages'],
    queryFn: getDashboardStages,
  })
  const stages = data ?? FALLBACK_STAGES

  return (
    <div className="p-6" style={cardStyle}>
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
        <span className="text-xs" style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}>
          Live counts
        </span>
      </div>

      <div className="flex items-end gap-1 mb-6 h-16 px-2">
        {[35, 42, 28, 55, 48, 60, 72, 65, 50, 80, 70, 85, 78, 92].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all"
            style={{
              height: `${h}%`,
              background: i >= 12 ? 'var(--ip-primary-gradient)' : 'var(--ip-border-subtle)',
              opacity: i >= 12 ? 1 : 0.5,
            }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        {stages.map((stage, i) => (
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
                style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}
              >
                {stage.label}
              </span>
            </div>
            {i < stages.length - 1 && (
              <ChevronRight size={16} className="shrink-0 mx-1" style={{ color: 'var(--ip-border)' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TopPerformer() {
  const navigate = useNavigate()
  const { data: analytics } = useQuery({
    queryKey: ['analytics', '30d'],
    queryFn: () => getAnalytics('30d'),
  })
  const top = analytics?.top_performers?.[0]

  if (!top) {
    return (
      <div style={cardStyle} className="overflow-hidden flex flex-col items-center justify-center p-10 text-center gap-4">
        <Flame size={32} style={{ color: 'var(--ip-border)' }} />
        <div>
          <p className="font-semibold mb-1" style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}>
            No top performer yet
          </p>
          <p className="text-sm" style={{ color: 'var(--ip-text-secondary)', fontFamily: 'var(--ip-font-body)' }}>
            Publish content and run analytics to see your best-performing pieces here.
          </p>
        </div>
        <button
          onClick={() => navigate('/topics')}
          className="px-4 py-2 text-sm font-semibold text-white"
          style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
        >
          Start Creating
        </button>
      </div>
    )
  }

  return (
    <div style={cardStyle} className="overflow-hidden">
      <div className="px-6 pt-5 pb-3">
        <span className="text-[10px] font-semibold tracking-widest uppercase" style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}>
          Top Performer
        </span>
      </div>

      <div className="relative mx-4 overflow-hidden" style={{ borderRadius: 'var(--ip-radius-md)', height: 120 }}>
        <div className="absolute inset-0" style={{ background: `linear-gradient(145deg, color-mix(in srgb, ${top.accent_color} 80%, #000) 0%, ${top.accent_color} 100%)` }} />
        <div className="absolute bottom-3 left-3 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
          style={{ background: top.category_color, borderRadius: 'var(--ip-radius-full)', fontFamily: 'var(--ip-font-body)' }}>
          {top.category_label}
        </div>
        <div className="absolute top-3 right-3 px-2 py-0.5 text-[10px] font-medium text-white"
          style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 'var(--ip-radius-sm)', fontFamily: 'var(--ip-font-body)' }}>
          {top.trend === 'up' ? '↑' : '↓'} {top.trend_label}
        </div>
      </div>

      <div className="px-6 pt-4">
        <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
          {top.title}
        </h3>
      </div>

      <div className="flex gap-8 px-6 pt-4 pb-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider mb-0.5" style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}>
            Total Views
          </p>
          <p className="text-2xl font-bold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
            {top.views}
          </p>
        </div>
        <div className="flex items-start gap-2 flex-1">
          <Flame size={14} className="mt-5 shrink-0" style={{ color: 'var(--ip-error)' }} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ip-error)', fontFamily: 'var(--ip-font-body)' }}>
              Why it won
            </p>
            <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--ip-text-secondary)', fontFamily: 'var(--ip-font-body)' }}>
              Published {new Date(top.published_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function TacticalFeed() {
  const { data } = useQuery({
    queryKey: ['dashboard-feed'],
    queryFn: getDashboardFeed,
  })
  const items = data ?? FALLBACK_FEED

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
        {items.map((item) => {
          const { icon: Icon, color } = feedIcon(item.type)
          return (
            <div key={item.id} className="flex items-start gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
              >
                <Icon size={16} style={{ color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug truncate" style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-body)' }}>
                  {item.title}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}>
                  {timeAgo(item.created_at)}
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
  const navigate = useNavigate()

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
              onClick={() => navigate(action.to)}
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
  const { user } = useAuth()
  const displayName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || 'Agent'

  return (
    <div className="max-w-full">
      <header className="mb-8">
        <WorkspaceTabs />
        <div className="mt-4">
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
            Welcome back, {displayName}
          </h1>
          <p className="text-xs tracking-widest mt-1 uppercase" style={{ color: 'var(--ip-text-tertiary)', fontFamily: 'var(--ip-font-body)' }}>
            Vessel Command — Global Operations Status
          </p>
        </div>
      </header>

      <section className="mb-8">
        <PipelineFunnel />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TopPerformer />
        <div className="flex flex-col gap-8">
          <TacticalFeed />
          <QuickActions />
        </div>
      </section>
    </div>
  )
}
