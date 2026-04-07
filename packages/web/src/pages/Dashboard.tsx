import { useMemo, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Sparkles,
  TrendingUp,
  Target,
  Layers3,
  Search,
  WandSparkles,
  PenLine,
  Rocket,
  BarChart3,
  Loader2,
  CircleCheckBig,
  CircleAlert,
  Play,
  Clock3,
  ChevronRight,
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useJobPoller } from '@/hooks/useJobPoller'
import {
  getDashboardStages,
  getDashboardFeed,
  getAnalytics,
  triggerDiscover,
  triggerRescore,
  triggerAnalyze,
  type PipelineStage,
} from '@/api/services'

const FALLBACK_STAGES: PipelineStage[] = [
  { label: 'Discover', count: 0, color: 'var(--ip-stage-discover)' },
  { label: 'Angle', count: 0, color: 'var(--ip-stage-angle)' },
  { label: 'Hook', count: 0, color: 'var(--ip-stage-hook)' },
  { label: 'Script', count: 0, color: 'var(--ip-stage-script)' },
  { label: 'Publish', count: 0, color: 'var(--ip-stage-publish)' },
]

const FALLBACK_FEED = [
  { id: 'fallback-1', title: 'Pipeline ready. Start with AI discovery.', created_at: new Date().toISOString() },
]

const cardStyle: React.CSSProperties = {
  background: 'var(--ip-card-glass-bg)',
  backdropFilter: 'blur(var(--ip-card-glass-blur))',
  borderRadius: 'var(--ip-radius-lg)',
  border: '1px solid var(--ip-card-glass-border)',
  boxShadow: 'var(--ip-card-glass-shadow)',
}

const stepCards = [
  {
    title: 'Input your URL',
    desc: 'Anchor content to your brand voice and audience context in one step.',
    icon: Search,
  },
  {
    title: 'Swipe ideas',
    desc: 'Review generated opportunities quickly and keep only strong ideas.',
    icon: WandSparkles,
  },
  {
    title: 'Edit and customize',
    desc: 'Refine hooks and scripts with assistant support before publishing.',
    icon: PenLine,
  },
  {
    title: 'Download and publish',
    desc: 'Ship across your channels and feed results back into your brain.',
    icon: Rocket,
  },
]

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.max(0, Math.floor(diff / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function PipelineAction({
  title,
  subtitle,
  icon: Icon,
  trigger,
  onCompleted,
}: {
  title: string
  subtitle: string
  icon: React.ElementType
  trigger: () => Promise<{ job_id: string; status: string }>
  onCompleted?: () => void
}) {
  const { status, isActive, startPolling, reset } = useJobPoller()

  useEffect(() => {
    if (status === 'completed') {
      toast.success(`${title} completed`)
      onCompleted?.()
      setTimeout(reset, 1200)
    }
    if (status === 'failed') {
      toast.error(`${title} failed`)
      setTimeout(reset, 1200)
    }
  }, [onCompleted, reset, status, title])

  async function handleClick() {
    try {
      const { job_id } = await trigger()
      startPolling(job_id)
      toast.info(`${title} started`)
    } catch {
      toast.error(`Unable to start ${title.toLowerCase()}`)
    }
  }

  const isBusy = isActive && (status === 'pending' || status === 'running')

  return (
    <button
      onClick={handleClick}
      disabled={isBusy}
      className="w-full p-4 text-left transition-all disabled:opacity-65"
      style={{
        ...cardStyle,
        borderColor: status === 'completed' ? 'color-mix(in srgb, var(--ip-success) 45%, transparent)' : 'var(--ip-card-glass-border)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'color-mix(in srgb, var(--ip-primary) 14%, transparent)' }}
        >
          <Icon size={16} style={{ color: 'var(--ip-primary)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5" style={{ color: 'var(--ip-text)' }}>
            {title}
          </p>
          <p className="text-xs" style={{ color: 'var(--ip-text-secondary)' }}>
            {subtitle}
          </p>
        </div>
        <div className="shrink-0 pt-0.5">
          {isBusy ? (
            <Loader2 size={15} className="animate-spin" style={{ color: 'var(--ip-primary)' }} />
          ) : status === 'completed' ? (
            <CircleCheckBig size={15} style={{ color: 'var(--ip-success)' }} />
          ) : status === 'failed' ? (
            <CircleAlert size={15} style={{ color: 'var(--ip-error)' }} />
          ) : (
            <Play size={14} style={{ color: 'var(--ip-text-tertiary)' }} />
          )}
        </div>
      </div>
    </button>
  )
}

export function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Operator'

  const { data: stagesData } = useQuery({ queryKey: ['dashboard-stages'], queryFn: getDashboardStages })
  const { data: feedData } = useQuery({ queryKey: ['dashboard-feed'], queryFn: getDashboardFeed })
  const { data: analytics } = useQuery({ queryKey: ['analytics', '30d'], queryFn: () => getAnalytics('30d') })

  const stages = stagesData ?? FALLBACK_STAGES
  const feed = feedData ?? FALLBACK_FEED
  const topPerformer = analytics?.top_performers?.[0]

  const refreshDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-stages'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-feed'] })
    queryClient.invalidateQueries({ queryKey: ['analytics'] })
    queryClient.invalidateQueries({ queryKey: ['topics'] })
  }, [queryClient])

  const stats = useMemo(() => {
    const totalPipelineItems = stages.reduce((sum, stage) => sum + stage.count, 0)
    const discoverCount = stages.find((s) => s.label.toLowerCase() === 'discover')?.count ?? 0
    const publishCount = stages.find((s) => s.label.toLowerCase() === 'publish')?.count ?? 0
    const conversion = discoverCount > 0 ? Math.round((publishCount / discoverCount) * 100) : 0
    const topViews = topPerformer ? topPerformer.views : '0'

    return [
      { label: 'Pipeline Volume', value: `${totalPipelineItems}`, note: 'Active content items', icon: Layers3 },
      { label: 'Top Asset Views', value: `${topViews}`, note: 'Best performer (30d)', icon: TrendingUp },
      { label: 'Discover -> Publish', value: `${conversion}%`, note: 'Current conversion rate', icon: Target },
      { label: 'Live Stages', value: `${stages.length}`, note: 'Workflow nodes active', icon: BarChart3 },
    ]
  }, [stages, topPerformer])

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 p-8" style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(500px 180px at 0% 0%, rgba(238,68,84,0.16) 0%, transparent 70%), radial-gradient(420px 160px at 100% 0%, rgba(62,134,198,0.16) 0%, transparent 72%)',
            }}
          />
          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: 'var(--ip-text-tertiary)' }}>
              Welcome back, {displayName}
            </p>
            <h1 className="text-4xl md:text-5xl font-bold leading-tight" style={{ color: 'var(--ip-text)' }}>
              Launch 10x more content.
              <br />
              75% faster.
            </h1>
            <p className="mt-4 max-w-2xl text-sm md:text-base" style={{ color: 'var(--ip-text-secondary)' }}>
              Skip the tabs and move from discovery to publish in one connected workflow.
              This dashboard tracks execution and tells you exactly where momentum drops.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => navigate('/topics')}
                className="px-5 py-2.5 text-sm font-semibold text-white"
                style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)', boxShadow: 'var(--ip-shadow-md)' }}
              >
                Start Discovering
              </button>
              <button
                onClick={() => navigate('/scripts')}
                className="px-5 py-2.5 text-sm font-semibold"
                style={{ background: 'var(--ip-surface)', color: 'var(--ip-text)', border: '1px solid var(--ip-border)', borderRadius: 'var(--ip-radius-full)' }}
              >
                Open Script Studio
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3" style={cardStyle}>
          <p className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--ip-text-tertiary)' }}>
            Quick Proof
          </p>
          <div className="space-y-2">
            {['AI-driven pipeline', 'Real-time stage tracking', 'One place for topics to scripts', 'Built for fast creators'].map((item) => (
              <div
                key={item}
                className="px-3 py-2 rounded-md text-xs font-medium"
                style={{
                  background: 'var(--ip-bg-subtle)',
                  color: 'var(--ip-text-secondary)',
                  border: '1px solid var(--ip-border-subtle)',
                }}
              >
                {item}
              </div>
            ))}
          </div>
          <div
            className="mt-2 p-3 rounded-lg"
            style={{
              background: 'color-mix(in srgb, var(--ip-primary) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--ip-primary) 35%, transparent)',
            }}
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--ip-primary)' }}>
              Ready to create agency-like content?
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, note, icon: Icon }) => (
          <div key={label} className="p-4" style={cardStyle}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--ip-text-tertiary)' }}>
                {label}
              </p>
              <Icon size={14} style={{ color: 'var(--ip-primary)' }} />
            </div>
            <p className="text-3xl font-bold mb-1" style={{ color: 'var(--ip-text)' }}>
              {value}
            </p>
            <p className="text-xs" style={{ color: 'var(--ip-text-secondary)' }}>
              {note}
            </p>
          </div>
        ))}
      </section>

      <section className="p-6" style={cardStyle}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--ip-text-tertiary)' }}>
              How It Works
            </p>
            <h2 className="text-2xl font-bold mt-1">Your AI marketing workflow in 4 steps</h2>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {stepCards.map((step, idx) => (
            <div
              key={step.title}
              className="p-4 rounded-lg"
              style={{ background: 'var(--ip-bg-subtle)', border: '1px solid var(--ip-border-subtle)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <step.icon size={16} style={{ color: 'var(--ip-primary)' }} />
                <span className="text-[10px] font-semibold" style={{ color: 'var(--ip-text-tertiary)' }}>
                  0{idx + 1}
                </span>
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ip-text)' }}>
                {step.title}
              </p>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ip-text-secondary)' }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 p-6" style={cardStyle}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold">Pipeline Status</h2>
            <button
              onClick={() => navigate('/analytics')}
              className="text-xs font-semibold inline-flex items-center gap-1"
              style={{ color: 'var(--ip-text-brand)' }}
            >
              View analytics
              <ChevronRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {stages.map((stage) => (
              <div
                key={stage.label}
                className="p-4 rounded-lg"
                style={{ border: '1px solid var(--ip-border-subtle)', background: 'var(--ip-surface)' }}
              >
                <p className="text-[10px] uppercase tracking-[0.15em] mb-1" style={{ color: 'var(--ip-text-tertiary)' }}>
                  {stage.label}
                </p>
                <p className="text-3xl font-bold" style={{ color: stage.color, fontFamily: 'var(--ip-font-mono)' }}>
                  {stage.count}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6" style={cardStyle}>
          <h2 className="text-xl font-bold mb-4">Tactical Feed</h2>
          <div className="space-y-3">
            {feed.slice(0, 6).map((item) => (
              <div key={item.id} className="p-3 rounded-lg" style={{ background: 'var(--ip-bg-subtle)', border: '1px solid var(--ip-border-subtle)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--ip-text)' }}>
                  {item.title}
                </p>
                <p className="text-xs inline-flex items-center gap-1.5 mt-1" style={{ color: 'var(--ip-text-tertiary)' }}>
                  <Clock3 size={11} />
                  {timeAgo(item.created_at)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PipelineAction
            title="Discover Topics"
            subtitle="Generate high-potential ideas from your niche signals."
            icon={Search}
            trigger={() => triggerDiscover('keywords', [])}
            onCompleted={refreshDashboard}
          />
          <PipelineAction
            title="Re-score Topics"
            subtitle="Recalculate opportunity scores with latest performance data."
            icon={Sparkles}
            trigger={triggerRescore}
            onCompleted={refreshDashboard}
          />
          <PipelineAction
            title="Run Analytics"
            subtitle="Refresh insights and identify where to improve conversion."
            icon={BarChart3}
            trigger={triggerAnalyze}
            onCompleted={refreshDashboard}
          />
        </div>
      </section>
    </div>
  )
}
