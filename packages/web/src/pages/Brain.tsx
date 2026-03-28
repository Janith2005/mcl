import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Users, ShieldAlert, Zap, ChevronRight, Loader2, Plus } from 'lucide-react'
import { getBrain, syncBrain, exportBrainSchema, addGuardrail } from '@/api/services'

const glassCard: React.CSSProperties = {
  background: 'var(--ip-surface-glass)',
  backdropFilter: 'blur(var(--ip-glass-blur))',
  borderRadius: 'var(--ip-radius-lg)',
  boxShadow: 'var(--ip-shadow-md)',
  border: '1px solid var(--ip-border-subtle)',
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
