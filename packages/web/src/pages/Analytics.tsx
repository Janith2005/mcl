import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  TrendingUp,
  TrendingDown,
  Download,
  Eye,
  AlertTriangle,
  ArrowUpRight,
  Loader2,
  BarChart3,
} from 'lucide-react'
import { getAnalytics, exportAnalytics, triggerAnalyze } from '@/api/services'
import { useJobPoller } from '@/hooks/useJobPoller'
import { toast } from 'sonner'

type TimeRange = '7 Days' | '30 Days' | 'All Time'

const glassCard: React.CSSProperties = {
  background: 'var(--ip-card-glass-bg)',
  backdropFilter: 'blur(var(--ip-card-glass-blur))',
  borderRadius: 'var(--ip-radius-lg)',
  boxShadow: 'var(--ip-card-glass-shadow)',
  border: '1px solid var(--ip-card-glass-border)',
}

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
  const queryClient = useQueryClient()
  const [timeRange, setTimeRange] = useState<TimeRange>('30 Days')
  const timeRanges: TimeRange[] = ['7 Days', '30 Days', 'All Time']
  const maxBarHeight = 120
  const analyzePoller = useJobPoller()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: () => getAnalytics(timeRange),
  })

  const exportMutation = useMutation({
    mutationFn: exportAnalytics,
    onSuccess: () => toast.success('Report exported'),
    onError: () => toast.error('Export failed'),
  })

  async function handleRunAnalysis() {
    try {
      const { job_id } = await triggerAnalyze()
      analyzePoller.startPolling(job_id)
      toast.info('Analysis started…')
    } catch {
      toast.error('Failed to start analysis')
    }
  }

  useEffect(() => {
    if (analyzePoller.status === 'completed') {
      toast.success('Analysis complete! Brain weights updated.')
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      setTimeout(analyzePoller.reset, 3000)
    }
    if (analyzePoller.status === 'failed') {
      toast.error('Analysis failed')
      setTimeout(analyzePoller.reset, 3000)
    }
  }, [analyzePoller.status])

  const topPerformers = data?.top_performers ?? []
  const hookPatternData = data?.hook_pattern_data ?? []
  const pipelineStages = data?.pipeline_stages ?? []
  const tacticalLog = data?.tactical_log ?? []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
            Performance Intelligence
          </h1>
          <p className="text-sm" style={{ color: 'var(--ip-text-secondary)' }}>
            Real-time engagement metrics and algorithmic feedback.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex p-1" style={{ background: 'var(--ip-bg-subtle)', borderRadius: 'var(--ip-radius-full)' }}>
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

          <button
            onClick={handleRunAnalysis}
            disabled={analyzePoller.isActive}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
          >
            {analyzePoller.isActive ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
            {analyzePoller.isActive ? 'Analyzing…' : 'Run Analysis'}
          </button>

          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ border: '1px solid var(--ip-border)', borderRadius: 'var(--ip-radius-full)', color: 'var(--ip-text-secondary)', background: 'transparent' }}
          >
            {exportMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--ip-primary)' }} />
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Left Column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Top Performer Cards */}
            <div className="grid grid-cols-3 gap-4">
              {topPerformers.length === 0 ? (
                <div className="col-span-3 p-10 text-center flex flex-col items-center gap-4" style={glassCard}>
                  <BarChart3 size={36} style={{ color: 'var(--ip-border)' }} />
                  <div>
                    <p className="font-semibold mb-1" style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}>No analytics data yet</p>
                    <p className="text-sm" style={{ color: 'var(--ip-text-tertiary)' }}>Add analytics entries then run an analysis to see performance insights.</p>
                  </div>
                  <button
                    onClick={handleRunAnalysis}
                    disabled={analyzePoller.isActive}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
                  >
                    {analyzePoller.isActive ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />}
                    {analyzePoller.isActive ? 'Analyzing…' : 'Run First Analysis'}
                  </button>
                </div>
              ) : (
                topPerformers.map((perf) => (
                  <div
                    key={perf.id}
                    className="p-5 transition-shadow hover:shadow-md"
                    style={{ ...glassCard, borderTop: `3px solid ${perf.accent_color}` }}
                  >
                    <span
                      className="inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-2"
                      style={{
                        color: perf.category_color,
                        background: `color-mix(in srgb, ${perf.category_color} 12%, transparent)`,
                        borderRadius: 'var(--ip-radius-full)',
                      }}
                    >
                      {perf.category_label}
                    </span>
                    <h3 className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
                      {perf.title}
                    </h3>
                    <p className="text-xs mb-3" style={{ color: 'var(--ip-text-tertiary)' }}>
                      {perf.published_at}
                    </p>
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <Eye size={12} style={{ color: 'var(--ip-text-tertiary)' }} />
                          <span className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>Views</span>
                        </div>
                        <span className="text-2xl font-bold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
                          {perf.views}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <MiniSparkline color={perf.accent_color} />
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
                            {perf.trend_label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Hook Pattern Performance */}
            {hookPatternData.length > 0 && (
              <div className="p-6" style={glassCard}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
                      Hook Pattern Performance
                    </h3>
                    <p className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
                      Comparison of engagement rates across hook types
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--ip-primary)' }} />
                      <span className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>AVG VIEW DURATION</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--ip-primary)', opacity: 0.4 }} />
                      <span className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>CLICK THROUGH</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-3" style={{ height: maxBarHeight + 40 }}>
                  {hookPatternData.map((pattern) => (
                    <div key={pattern.label} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex items-end gap-1 w-full justify-center" style={{ height: maxBarHeight }}>
                        <div
                          className="w-5 rounded-t transition-all"
                          style={{ height: `${(pattern.avg_view / 100) * maxBarHeight}px`, background: pattern.color }}
                        />
                        <div
                          className="w-5 rounded-t transition-all"
                          style={{ height: `${(pattern.click_through / 100) * maxBarHeight}px`, background: pattern.color, opacity: 0.4 }}
                        />
                      </div>
                      <span className="text-[10px] font-medium mt-2 text-center uppercase" style={{ color: 'var(--ip-text-tertiary)' }}>
                        {pattern.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tactical Log */}
            {tacticalLog.length > 0 && (
              <div className="flex gap-4">
                <div className="flex-1 p-6" style={glassCard}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
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

                  <div className="grid grid-cols-12 gap-4 pb-3 mb-3 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ip-text-tertiary)', borderBottom: '1px solid var(--ip-border-subtle)' }}>
                    <div className="col-span-4">Post Insight</div>
                    <div className="col-span-2">Views</div>
                    <div className="col-span-2">Engagement</div>
                    <div className="col-span-4">Brain Feedback</div>
                  </div>

                  {tacticalLog.map((row, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-4 py-3 items-center transition-colors hover:bg-[var(--ip-bg-subtle)]"
                      style={{ borderBottom: idx < tacticalLog.length - 1 ? '1px solid var(--ip-border-subtle)' : 'none', borderRadius: 'var(--ip-radius-sm)' }}
                    >
                      <div className="col-span-4 flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ background: 'var(--ip-primary-gradient)' }}
                        >
                          {row.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--ip-text)' }}>{row.title}</p>
                          <p className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>{row.subtitle}</p>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--ip-text)' }}>{row.views}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--ip-text)' }}>{row.engagement}</span>
                      </div>
                      <div className="col-span-4">
                        <span
                          className="text-xs px-3 py-1 inline-block"
                          style={{ background: 'var(--ip-bg-subtle)', borderRadius: 'var(--ip-radius-full)', color: 'var(--ip-text-secondary)' }}
                        >
                          {row.feedback}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pipeline Health */}
          {pipelineStages.length > 0 && (
            <div className="w-72 flex-shrink-0 space-y-6">
              <div className="p-5" style={glassCard}>
                <h3 className="text-sm font-bold mb-1" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
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
                        <span className="text-xs font-bold" style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}>
                          {stage.percent}%
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'var(--ip-border)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${stage.percent}%`, background: stage.color }}
                        />
                      </div>
                      <div className="mt-1">
                        <span
                          className="inline-block px-2 py-0.5 text-[10px] font-medium text-white"
                          style={{ background: stage.color, borderRadius: 'var(--ip-radius-full)' }}
                        >
                          {stage.pill_label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="p-4 flex items-start gap-3"
                style={{ ...glassCard, borderLeft: '3px solid var(--ip-warning)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(245, 158, 11, 0.12)' }}
                >
                  <AlertTriangle size={16} style={{ color: 'var(--ip-warning)' }} />
                </div>
                <div>
                  <p className="text-xs font-bold mb-1" style={{ color: 'var(--ip-error)' }}>Bottleneck Alert</p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--ip-text-secondary)' }}>
                    Production is lagging behind Scripting. Consider filming batches.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
