import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Users, ShieldAlert, Zap, ChevronRight, Loader2, Plus, Search, Link, CheckCircle } from 'lucide-react'
import { getBrain, syncBrain, exportBrainSchema, addGuardrail, triggerScrape, triggerRipper, getReconReports, getReconReport } from '@/api/services'
import { useJobPoller } from '@/hooks/useJobPoller'
import { toast } from 'sonner'

const glassCard: React.CSSProperties = {
  background: 'var(--ip-surface-glass)',
  backdropFilter: 'blur(var(--ip-glass-blur))',
  borderRadius: 'var(--ip-radius-lg)',
  boxShadow: 'var(--ip-shadow-md)',
  border: '1px solid var(--ip-border-subtle)',
}

function ReconPanel() {
  const queryClient = useQueryClient()
  const [handles, setHandles] = useState('')
  const [urls, setUrls] = useState('')
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const scrapePoller = useJobPoller()
  const ripperPoller = useJobPoller()

  const { data: reports = [] } = useQuery({
    queryKey: ['recon-reports'],
    queryFn: getReconReports,
  })

  const { data: selectedReport } = useQuery({
    queryKey: ['recon-report', selectedReportId],
    queryFn: () => getReconReport(selectedReportId!),
    enabled: !!selectedReportId,
  })

  async function handleScrape() {
    const list = handles.split(',').map(h => h.trim()).filter(Boolean)
    if (!list.length) return
    try {
      const { job_id } = await triggerScrape(list)
      scrapePoller.startPolling(job_id)
      toast.info('Competitor scrape started…')
    } catch {
      toast.error('Failed to start scrape')
    }
  }

  async function handleRipper() {
    const list = urls.split('\n').map(u => u.trim()).filter(Boolean)
    if (!list.length) return
    try {
      const { job_id } = await triggerRipper(list)
      ripperPoller.startPolling(job_id)
      toast.info('Skeleton rip started…')
    } catch {
      toast.error('Failed to start ripper')
    }
  }

  if (scrapePoller.status === 'completed') {
    queryClient.invalidateQueries({ queryKey: ['recon-reports'] })
    toast.success('Competitor scrape complete!')
    setTimeout(scrapePoller.reset, 3000)
  }
  if (ripperPoller.status === 'completed') {
    queryClient.invalidateQueries({ queryKey: ['recon-reports'] })
    toast.success('Skeleton rip complete!')
    setTimeout(ripperPoller.reset, 3000)
  }

  return (
    <div className="mb-8 p-6" style={glassCard}>
      <h2 className="text-lg font-bold mb-5" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
        Recon Intelligence
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Competitor Scraper */}
        <div className="p-4 rounded-lg" style={{ background: 'var(--ip-bg-subtle)', border: '1px solid var(--ip-border-subtle)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Search size={14} style={{ color: 'var(--ip-primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--ip-text)' }}>Competitor Scraper</span>
          </div>
          <input
            value={handles}
            onChange={e => setHandles(e.target.value)}
            placeholder="@handle1, @handle2, @handle3"
            className="w-full py-2 px-3 text-sm outline-none mb-3"
            style={{ border: '1px solid var(--ip-border)', borderRadius: 'var(--ip-radius-md)', background: 'var(--ip-surface)', color: 'var(--ip-text)' }}
          />
          <button
            onClick={handleScrape}
            disabled={scrapePoller.isActive || !handles.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
          >
            {scrapePoller.isActive ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
            {scrapePoller.isActive ? 'Scraping…' : 'Run Scrape'}
          </button>
        </div>

        {/* Skeleton Ripper */}
        <div className="p-4 rounded-lg" style={{ background: 'var(--ip-bg-subtle)', border: '1px solid var(--ip-border-subtle)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Link size={14} style={{ color: 'var(--ip-primary)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--ip-text)' }}>Skeleton Ripper</span>
          </div>
          <textarea
            value={urls}
            onChange={e => setUrls(e.target.value)}
            placeholder="Paste YouTube URLs (one per line)"
            rows={2}
            className="w-full py-2 px-3 text-sm outline-none resize-none mb-3"
            style={{ border: '1px solid var(--ip-border)', borderRadius: 'var(--ip-radius-md)', background: 'var(--ip-surface)', color: 'var(--ip-text)' }}
          />
          <button
            onClick={handleRipper}
            disabled={ripperPoller.isActive || !urls.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
          >
            {ripperPoller.isActive ? <Loader2 size={12} className="animate-spin" /> : <Link size={12} />}
            {ripperPoller.isActive ? 'Ripping…' : 'Rip Skeleton'}
          </button>
        </div>
      </div>

      {/* Recent Reports */}
      {reports.length > 0 && (
        <div>
          <p className="text-[10px] tracking-widest font-semibold mb-3" style={{ color: 'var(--ip-text-tertiary)' }}>RECENT REPORTS</p>
          <div className="space-y-2 mb-4">
            {reports.slice(0, 5).map(r => {
              const type = r.config?.type as string
              const handles = r.config?.handles as string[] | undefined
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedReportId(selectedReportId === r.id ? null : r.id)}
                  className="w-full flex items-center gap-3 py-2 px-3 rounded-lg text-left transition-colors hover:opacity-80"
                  style={{
                    background: selectedReportId === r.id ? 'var(--ip-bg-subtle)' : 'var(--ip-surface)',
                    border: `1px solid ${selectedReportId === r.id ? 'var(--ip-primary)' : 'var(--ip-border-subtle)'}`,
                  }}
                >
                  <CheckCircle size={14} style={{ color: 'var(--ip-success)' }} />
                  <span className="text-xs font-medium flex-1" style={{ color: 'var(--ip-text)' }}>
                    {type === 'competitor_scrape' ? 'Competitor Scrape' : 'Skeleton Rip'}
                    {type === 'competitor_scrape' && handles?.length ? ` — ${handles.slice(0,2).join(', ')}` : ''}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--ip-text-tertiary)' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Report Detail */}
          {selectedReport && (() => {
            const type = selectedReport.config?.type as string
            const synthesis = (selectedReport.synthesis ?? {}) as Record<string, unknown>
            const topPatterns = Array.isArray(synthesis.top_patterns)
              ? (synthesis.top_patterns as Array<{ pattern?: string; example_title?: string }>)
              : []
            const contentGaps = Array.isArray(synthesis.content_gaps)
              ? (synthesis.content_gaps as string[])
              : []
            const hookStyles = Array.isArray(synthesis.hook_styles)
              ? (synthesis.hook_styles as string[])
              : []
            const postingInsights = typeof synthesis.posting_insights === 'string'
              ? synthesis.posting_insights
              : null
            const engagementDrivers = Array.isArray(synthesis.engagement_drivers)
              ? (synthesis.engagement_drivers as string[])
              : []
            const adaptableElements = Array.isArray(synthesis.adaptable_elements)
              ? (synthesis.adaptable_elements as string[])
              : []
            const avoidElements = Array.isArray(synthesis.avoid_elements)
              ? (synthesis.avoid_elements as string[])
              : []
            const skeleton = synthesis.skeleton && typeof synthesis.skeleton === 'object'
              ? (synthesis.skeleton as { hook_formula?: string; section_flow?: string[] })
              : null

            return (
              <div className="p-4 rounded-lg space-y-4" style={{ background: 'var(--ip-bg-subtle)', border: '1px solid var(--ip-border-subtle)' }}>
                {type === 'competitor_scrape' && (
                  <>
                    {topPatterns.length > 0 && (
                      <div>
                        <p className="text-[10px] tracking-widest font-semibold mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>TOP PATTERNS</p>
                        <div className="space-y-1">
                          {topPatterns.map((p, i) => (
                            <p key={i} className="text-xs" style={{ color: 'var(--ip-text-secondary)' }}>- <strong>{p.pattern}</strong> - {p.example_title}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {contentGaps.length > 0 && (
                      <div>
                        <p className="text-[10px] tracking-widest font-semibold mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>CONTENT GAPS TO EXPLOIT</p>
                        <div className="space-y-1">
                          {contentGaps.map((g, i) => (
                            <p key={i} className="text-xs" style={{ color: 'var(--ip-success)' }}>{'->'} {g}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {hookStyles.length > 0 && (
                      <div>
                        <p className="text-[10px] tracking-widest font-semibold mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>HOOK FORMULAS THEY USE</p>
                        <div className="space-y-1">
                          {hookStyles.map((h, i) => (
                            <p key={i} className="text-xs font-mono" style={{ color: 'var(--ip-text-brand)' }}>{h}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {postingInsights && (
                      <div>
                        <p className="text-[10px] tracking-widest font-semibold mb-1" style={{ color: 'var(--ip-text-tertiary)' }}>POSTING INSIGHTS</p>
                        <p className="text-xs" style={{ color: 'var(--ip-text-secondary)' }}>{postingInsights}</p>
                      </div>
                    )}
                  </>
                )}
                {type === 'skeleton_rip' && (
                  <>
                    {engagementDrivers.length > 0 && (
                      <div>
                        <p className="text-[10px] tracking-widest font-semibold mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>ENGAGEMENT DRIVERS</p>
                        {engagementDrivers.map((d, i) => (
                          <p key={i} className="text-xs" style={{ color: 'var(--ip-text-secondary)' }}>- {d}</p>
                        ))}
                      </div>
                    )}
                    {adaptableElements.length > 0 && (
                      <div>
                        <p className="text-[10px] tracking-widest font-semibold mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>STEAL & ADAPT</p>
                        {adaptableElements.map((e, i) => (
                          <p key={i} className="text-xs" style={{ color: 'var(--ip-success)' }}>{'->'} {e}</p>
                        ))}
                      </div>
                    )}
                    {avoidElements.length > 0 && (
                      <div>
                        <p className="text-[10px] tracking-widest font-semibold mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>DON'T COPY</p>
                        {avoidElements.map((e, i) => (
                          <p key={i} className="text-xs" style={{ color: 'var(--ip-error)' }}>x {e}</p>
                        ))}
                      </div>
                    )}
                    {skeleton && (
                      <div>
                        <p className="text-[10px] tracking-widest font-semibold mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>CONTENT SKELETON</p>
                        <p className="text-xs mb-1" style={{ color: 'var(--ip-text-brand)' }}>Hook: {skeleton.hook_formula}</p>
                        {skeleton.section_flow?.map((sec, i) => (
                          <p key={i} className="text-xs" style={{ color: 'var(--ip-text-secondary)' }}>{i + 1}. {sec}</p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export function BrainPage() {
  const queryClient = useQueryClient()
  const [guardrailTitle, setGuardrailTitle] = useState('')
  const [guardrailDesc, setGuardrailDesc] = useState('')
  const [showGuardrailForm, setShowGuardrailForm] = useState(false)

  const { data: brain, isLoading, isError } = useQuery({
    queryKey: ['brain'],
    queryFn: getBrain,
    retry: false,
  })

  const syncMutation = useMutation({
    mutationFn: syncBrain,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brain'] }),
  })

  const exportMutation = useMutation({
    mutationFn: exportBrainSchema,
  })

  const guardrailMutation = useMutation({
    mutationFn: () => addGuardrail({ title: guardrailTitle, description: guardrailDesc }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brain'] })
      setGuardrailTitle('')
      setGuardrailDesc('')
      setShowGuardrailForm(false)
    },
  })

  const insights = brain?.insights ?? []
  const guardrails = brain?.guardrails ?? []
  const usageMins = brain?.usage_mins ?? 0
  const usageLimit = brain?.usage_limit ?? 1000
  const usagePercent = Math.min((usageMins / usageLimit) * 100, 100)

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
            <span style={{ fontFamily: 'var(--ip-font-serif)', fontStyle: 'italic', fontWeight: 400 }}>
              Maturity
            </span>
          </h1>
          <p className="text-sm md:text-base max-w-xl leading-relaxed" style={{ color: 'var(--ip-text-secondary)' }}>
            Your tactical assistant's knowledge base. Tuning these parameters directly influences
            script generation and campaign strategy.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-10">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="py-2.5 px-6 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
            style={{
              background: 'var(--ip-primary-gradient)',
              borderRadius: 'var(--ip-radius-full)',
              color: 'var(--ip-text-on-primary)',
            }}
          >
            {syncMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            {syncMutation.isPending ? 'Syncing...' : 'Initiate Deep Sync'}
          </button>
          {syncMutation.isSuccess && (
            <span className="text-xs self-center" style={{ color: 'var(--ip-success)' }}>
              Sync complete!
            </span>
          )}
          <button
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
            className="py-2.5 px-6 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2"
            style={{
              background: 'linear-gradient(135deg, var(--ip-primary-end) 0%, var(--ip-primary) 100%)',
              borderRadius: 'var(--ip-radius-full)',
              color: 'var(--ip-text-on-primary)',
            }}
          >
            {exportMutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Export Schema
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--ip-primary)' }} />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <Zap size={40} style={{ color: 'var(--ip-border)' }} />
            <div>
              <p className="font-semibold mb-1" style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}>
                Brain not initialized yet
              </p>
              <p className="text-sm" style={{ color: 'var(--ip-text-secondary)' }}>
                Complete onboarding and add topics to start training your Agent Brain.
              </p>
            </div>
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
            >
              {syncMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
              Initialize Brain
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            {/* Target Audience Persona */}
            <div className="col-span-1 lg:col-span-2 p-6" style={glassCard}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--ip-bg-subtle)' }}>
                  <Users size={18} style={{ color: 'var(--ip-primary)' }} />
                </div>
                <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
                  Target Audience Persona
                </h2>
              </div>

              <div className="mb-5">
                <p className="text-[10px] tracking-widest font-semibold mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>
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
                  {brain?.demographics || 'Not configured. Run onboarding to set your audience persona.'}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] tracking-widest font-semibold mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>
                    MAIN PAIN POINTS
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ip-text-secondary)' }}>
                    {brain?.pain_points || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] tracking-widest font-semibold mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>
                    DESIRES
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--ip-text-secondary)' }}>
                    {brain?.desires || '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Topic Constraints / Guardrails */}
            <div className="p-6" style={glassCard}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--ip-bg-subtle)' }}>
                  <ShieldAlert size={18} style={{ color: 'var(--ip-primary)' }} />
                </div>
                <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
                  Topic Constraints
                </h2>
              </div>

              <div className="space-y-4">
                {guardrails.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--ip-text-tertiary)' }}>
                    No guardrails set. Add one below.
                  </p>
                ) : (
                  guardrails.map((g) => (
                    <div key={g.id}>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            background: g.severity === 'high' ? 'var(--ip-error)' : g.severity === 'medium' ? 'var(--ip-warning)' : 'var(--ip-info)',
                          }}
                        />
                        <p className="text-sm font-semibold" style={{ color: 'var(--ip-text)' }}>{g.title}</p>
                      </div>
                      <p className="text-xs ml-4" style={{ color: 'var(--ip-text-secondary)' }}>{g.description}</p>
                    </div>
                  ))
                )}
              </div>

              {showGuardrailForm ? (
                <div className="mt-4 space-y-2">
                  <input
                    type="text"
                    value={guardrailTitle}
                    onChange={(e) => setGuardrailTitle(e.target.value)}
                    placeholder="Guardrail title"
                    className="w-full py-2 px-3 text-sm outline-none"
                    style={{
                      border: '1px solid var(--ip-border)',
                      borderRadius: 'var(--ip-radius-md)',
                      background: 'var(--ip-surface)',
                      color: 'var(--ip-text)',
                    }}
                  />
                  <input
                    type="text"
                    value={guardrailDesc}
                    onChange={(e) => setGuardrailDesc(e.target.value)}
                    placeholder="Description"
                    className="w-full py-2 px-3 text-sm outline-none"
                    style={{
                      border: '1px solid var(--ip-border)',
                      borderRadius: 'var(--ip-radius-md)',
                      background: 'var(--ip-surface)',
                      color: 'var(--ip-text)',
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => guardrailMutation.mutate()}
                      disabled={!guardrailTitle || guardrailMutation.isPending}
                      className="py-1.5 px-4 text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1"
                      style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
                    >
                      {guardrailMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                      Save
                    </button>
                    <button
                      onClick={() => setShowGuardrailForm(false)}
                      className="py-1.5 px-4 text-xs font-medium"
                      style={{ border: '1px solid var(--ip-border)', borderRadius: 'var(--ip-radius-full)', color: 'var(--ip-text-secondary)' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowGuardrailForm(true)}
                  className="mt-5 py-2 px-4 text-xs font-medium transition-colors flex items-center gap-1"
                  style={{
                    border: '1px solid var(--ip-border)',
                    borderRadius: 'var(--ip-radius-full)',
                    color: 'var(--ip-text-secondary)',
                    background: 'transparent',
                  }}
                >
                  <Plus size={12} />
                  Add New Guardrail
                </button>
              )}
            </div>

            {/* Recently Learned Insights */}
            <div className="p-6" style={glassCard}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--ip-bg-subtle)' }}>
                  <Zap size={18} style={{ color: 'var(--ip-primary)' }} />
                </div>
                <h2 className="text-lg font-bold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
                  Recently Learned Insights
                </h2>
              </div>

              <div className="space-y-4">
                {insights.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--ip-text-tertiary)' }}>
                    No insights yet. Complete the content loop to train the brain.
                  </p>
                ) : (
                  insights.map((insight) => (
                    <div key={insight.num} className="flex items-start gap-3 group cursor-pointer">
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
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recon Section */}
        <ReconPanel />

        {/* Usage Meter */}
        <div
          className="inline-flex flex-col gap-1.5 p-4"
          style={glassCard}
        >
          <p className="text-[10px] tracking-widest font-semibold" style={{ color: 'var(--ip-text-tertiary)' }}>
            USAGE
          </p>
          <p className="text-sm font-bold" style={{ color: 'var(--ip-text)' }}>
            {usageMins} / {usageLimit} AI mins
          </p>
          <div className="w-40 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ip-border)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${usagePercent}%`, background: 'var(--ip-primary-gradient)' }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
