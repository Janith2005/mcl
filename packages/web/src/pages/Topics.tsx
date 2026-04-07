import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  MoreHorizontal, Plus, ArrowUpRight, Clock, TrendingUp, Loader2,
  Sparkles, X, ChevronDown, Target, Zap, Shield,
} from 'lucide-react'
import {
  getTopics, createTopic, deleteTopic, updateTopic, generateTopics, triggerAngle, getJob, type Topic,
} from '@/api/services'

type ViewMode = 'kanban' | 'table'

// --- Helpers -----------------------------------------------------------------

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

function categoryColor(category: string | undefined): string {
  if (!category) return 'var(--ip-primary)'
  const map: Record<string, string> = {
    'TECH TRENDS': 'var(--ip-stage-discover)',
    TECH: 'var(--ip-stage-discover)',
    LIFESTYLE: 'var(--ip-stage-publish)',
    FINANCE: 'var(--ip-stage-hook)',
    HEALTH: 'var(--ip-stage-script)',
    FITNESS: 'var(--ip-stage-script)',
    BUSINESS: 'var(--ip-stage-angle)',
    GENERAL: 'var(--ip-primary)',
  }
  return map[category.toUpperCase()] ?? 'var(--ip-primary)'
}

function timeAgo(iso: string): string {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function ScoreBar({ label, value, icon, invert = false }: {
  label: string; value: number; icon: React.ReactNode; invert?: boolean
}) {
  const display = invert ? 100 - value : value
  const color = display >= 75 ? '#10b981' : display >= 50 ? '#6366f1' : '#f59e0b'
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span style={{ color: 'var(--ip-text-tertiary)' }}>{icon}</span>
          <span className="text-xs font-medium" style={{ color: 'var(--ip-text-secondary)' }}>{label}</span>
        </div>
        <span className="text-xs font-bold" style={{ color }}>{display}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ip-bg-subtle)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${display}%`, background: color }}
        />
      </div>
    </div>
  )
}

// --- Topic Detail Modal -------------------------------------------------------

function TopicDetailModal({
  topic, onClose, onDelete, onStatusChange,
}: {
  topic: Topic
  onClose: () => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: string) => void
}) {
  const navigate = useNavigate()
  const color = categoryColor(topic.category)
  const scoring = topic.scoring || {}
  const [status, setStatus] = useState(topic.status)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [generatingAngles, setGeneratingAngles] = useState(false)

  async function handleGenerateAngles() {
    setGeneratingAngles(true)
    try {
      const { job_id } = await triggerAngle([topic.id])
      toast.info('Generating angles for this topic...')

      const maxAttempts = 120
      let attempts = 0
      let status: 'pending' | 'running' | 'completed' | 'failed' = 'pending'
      let resultCount = 0

      while (attempts < maxAttempts) {
        attempts += 1
        await new Promise(resolve => setTimeout(resolve, 2000))
        const job = await getJob(job_id)
        status = job.status
        resultCount = Number(job.result?.result_count ?? 0)
        if (status === 'completed' || status === 'failed') break
      }

      const topicParam = `topic_id=${encodeURIComponent(topic.id)}`
      const jobParam = job_id ? `&job_id=${encodeURIComponent(job_id)}` : ''
      const targetUrl = `/angles?${topicParam}${jobParam}`

      if (status === 'completed' && resultCount > 0) {
        toast.success(`Generated ${resultCount} angle${resultCount === 1 ? '' : 's'}`)
        onClose()
        navigate(targetUrl)
        return
      }

      if (status === 'failed') {
        toast.error('Angle generation failed for this topic. Please retry.')
      } else if (status === 'completed') {
        toast.error('No angles were generated. Please retry.')
      } else {
        toast.error('Angle generation is taking longer than expected. Check Angles page.')
      }

      onClose()
      navigate(targetUrl)
    } catch {
      toast.error('Failed to start angle generation')
    } finally {
      setGeneratingAngles(false)
    }
  }

  const statuses: Array<{ value: Topic['status']; label: string }> = [
    { value: 'new', label: 'Discovered' },
    { value: 'developing', label: 'Developing' },
    { value: 'scripted', label: 'Scripted' },
  ]

  function handleStatusChange(s: Topic['status']) {
    setStatus(s)
    setShowStatusMenu(false)
    onStatusChange(topic.id, s)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden"
        style={{
          background: 'var(--ip-surface)',
          borderRadius: 'var(--ip-radius-xl)',
          border: '1px solid var(--ip-border-subtle)',
          boxShadow: 'var(--ip-shadow-xl)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between p-6 pb-4"
          style={{ borderBottom: '1px solid var(--ip-border-subtle)' }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-[10px] font-bold tracking-widest uppercase px-2.5 py-1"
              style={{
                color,
                background: `color-mix(in srgb, ${color} 15%, transparent)`,
                borderRadius: 'var(--ip-radius-full)',
                border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
              }}
            >
              {topic.category}
            </span>
            <span
              className="text-xs font-bold px-2.5 py-1 flex items-center gap-1"
              style={{
                color: getScoreColor(topic.score),
                background: getScoreBg(topic.score),
                borderRadius: 'var(--ip-radius-full)',
              }}
            >
              <TrendingUp size={10} /> {topic.score} score
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition-colors hover:bg-[var(--ip-bg-subtle)]"
            style={{ color: 'var(--ip-text-tertiary)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <h2
            className="text-lg font-bold mb-3 leading-snug"
            style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}
          >
            {topic.title}
          </h2>

          {topic.description && (
            <p className="text-sm mb-5 leading-relaxed" style={{ color: 'var(--ip-text-secondary)' }}>
              {topic.description}
            </p>
          )}

          {/* Score Breakdown */}
          {(scoring.virality !== undefined || scoring.relevance !== undefined || scoring.competition !== undefined) && (
            <div
              className="p-4 mb-5"
              style={{
                background: 'var(--ip-bg-subtle)',
                borderRadius: 'var(--ip-radius-lg)',
                border: '1px solid var(--ip-border-subtle)',
              }}
            >
              <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--ip-text-tertiary)' }}>
                Score Breakdown
              </p>
              <ScoreBar label="Virality Potential" value={scoring.virality ?? 70} icon={<Zap size={11} />} />
              <ScoreBar label="Relevance" value={scoring.relevance ?? 70} icon={<Target size={11} />} />
              <ScoreBar label="Opportunity Gap" value={scoring.competition ?? 50} icon={<Shield size={11} />} invert />
            </div>
          )}

          {/* Pillars */}
          {topic.pillars && topic.pillars.length > 0 && (
            <div className="mb-5">
              <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>
                Content Pillars
              </p>
              <div className="flex flex-wrap gap-1.5">
                {topic.pillars.map(pillar => (
                  <span
                    key={pillar}
                    className="text-[11px] font-medium px-2.5 py-1"
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
            </div>
          )}

          {/* Engagement */}
          {topic.engagement && (
            <div className="flex items-center gap-1.5 mb-5">
              <ArrowUpRight size={13} style={{ color: 'var(--ip-success)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--ip-success)' }}>
                {topic.engagement}
              </span>
            </div>
          )}

          {/* Status Selector */}
          <div className="mb-5 relative">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>
              Pipeline Stage
            </p>
            <button
              onClick={() => setShowStatusMenu(s => !s)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors"
              style={{
                background: 'var(--ip-bg-subtle)',
                border: '1px solid var(--ip-border-subtle)',
                borderRadius: 'var(--ip-radius-md)',
                color: 'var(--ip-text)',
              }}
            >
              {statuses.find(s => s.value === status)?.label ?? status}
              <ChevronDown size={13} style={{ color: 'var(--ip-text-tertiary)' }} />
            </button>
            {showStatusMenu && (
              <div
                className="absolute left-0 top-full mt-1 z-10 py-1 w-40"
                style={{
                  background: 'var(--ip-surface)',
                  border: '1px solid var(--ip-border-subtle)',
                  borderRadius: 'var(--ip-radius-md)',
                  boxShadow: 'var(--ip-shadow-lg)',
                }}
              >
                {statuses.map(s => (
                  <button
                    key={s.value}
                    onClick={() => handleStatusChange(s.value)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--ip-bg-subtle)] transition-colors"
                    style={{
                      color: status === s.value ? 'var(--ip-primary)' : 'var(--ip-text)',
                      fontWeight: status === s.value ? 600 : 400,
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderTop: '1px solid var(--ip-border-subtle)' }}
        >
          <button
            onClick={() => { onDelete(topic.id); onClose() }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-colors hover:bg-red-500/10"
            style={{ color: 'var(--ip-error)' }}
          >
            Delete Topic
          </button>
          <button
            onClick={handleGenerateAngles}
            disabled={generatingAngles}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
            style={{
              background: 'var(--ip-primary-gradient)',
              color: '#fff',
              borderRadius: 'var(--ip-radius-md)',
            }}
          >
            {generatingAngles ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {generatingAngles ? 'Starting...' : 'Generate Angles'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- AI Discover Modal --------------------------------------------------------

function DiscoverModal({
  onClose, onSubmit, isPending,
}: {
  onClose: () => void
  onSubmit: (niche: string, keywords: string, platform: string) => void
  isPending: boolean
}) {
  const [niche, setNiche] = useState('')
  const [keywords, setKeywords] = useState('')
  const [platform, setPlatform] = useState('youtube')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md"
        style={{
          background: 'var(--ip-surface)',
          borderRadius: 'var(--ip-radius-xl)',
          border: '1px solid var(--ip-border-subtle)',
          boxShadow: 'var(--ip-shadow-xl)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4" style={{ borderBottom: '1px solid var(--ip-border-subtle)' }}>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}>
              AI Topic Discovery
            </h3>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ip-text-tertiary)' }}>
              Generate 6 high-potential topic ideas with AI
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--ip-bg-subtle)] transition-colors" style={{ color: 'var(--ip-text-tertiary)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ip-text-secondary)' }}>
              Your Niche <span style={{ color: 'var(--ip-text-tertiary)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              value={niche}
              onChange={e => setNiche(e.target.value)}
              placeholder="e.g. personal finance for millennials"
              className="w-full px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: 'var(--ip-bg-subtle)',
                border: '1px solid var(--ip-border-subtle)',
                borderRadius: 'var(--ip-radius-md)',
                color: 'var(--ip-text)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ip-text-secondary)' }}>
              Keywords <span style={{ color: 'var(--ip-text-tertiary)', fontWeight: 400 }}>(optional, comma separated)</span>
            </label>
            <input
              value={keywords}
              onChange={e => setKeywords(e.target.value)}
              placeholder="e.g. investing, passive income, side hustle"
              className="w-full px-3 py-2.5 text-sm outline-none transition-colors"
              style={{
                background: 'var(--ip-bg-subtle)',
                border: '1px solid var(--ip-border-subtle)',
                borderRadius: 'var(--ip-radius-md)',
                color: 'var(--ip-text)',
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--ip-text-secondary)' }}>Platform</label>
            <div className="flex gap-2">
              {['youtube', 'instagram', 'tiktok'].map(p => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className="flex-1 py-2 text-xs font-medium capitalize transition-all"
                  style={{
                    background: platform === p ? 'var(--ip-primary-gradient)' : 'var(--ip-bg-subtle)',
                    color: platform === p ? '#fff' : 'var(--ip-text-secondary)',
                    borderRadius: 'var(--ip-radius-md)',
                    border: `1px solid ${platform === p ? 'transparent' : 'var(--ip-border-subtle)'}`,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={() => onSubmit(niche, keywords, platform)}
            disabled={isPending}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'var(--ip-primary-gradient)',
              color: '#fff',
              borderRadius: 'var(--ip-radius-md)',
            }}
          >
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            {isPending ? 'Discovering topics...' : 'Discover Topics'}
          </button>
        </div>
      </div>
    </div>
  )
}

// --- Topic Card ---------------------------------------------------------------

function TopicCard({
  topic, onSelect, onDelete,
}: {
  topic: Topic
  onSelect: (t: Topic) => void
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const color = categoryColor(topic.category)

  return (
    <div
      className="p-4 mb-3 cursor-pointer transition-all hover:translate-y-[-2px] relative"
      style={{
        background: 'var(--ip-card-glass-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: 'var(--ip-radius-lg)',
        boxShadow: 'var(--ip-shadow-md)',
        border: '1px solid var(--ip-border-subtle)',
      }}
      onClick={() => onSelect(topic)}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color }}>
          {topic.category}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="text-[11px] font-bold px-2 py-0.5 flex items-center gap-1"
            style={{
              color: getScoreColor(topic.score),
              background: getScoreBg(topic.score),
              borderRadius: 'var(--ip-radius-full)',
            }}
          >
            <TrendingUp size={9} />
            {topic.score}
          </span>
          <div className="relative">
            <button
              onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
              className="p-1 hover:bg-[var(--ip-bg-subtle)] rounded transition-colors"
            >
              <MoreHorizontal size={13} style={{ color: 'var(--ip-text-tertiary)' }} />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-6 z-10 py-1 w-32 text-sm"
                style={{
                  background: 'var(--ip-surface)',
                  border: '1px solid var(--ip-border-subtle)',
                  borderRadius: 'var(--ip-radius-md)',
                  boxShadow: 'var(--ip-shadow-lg)',
                }}
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => { onSelect(topic); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--ip-bg-subtle)] transition-colors"
                  style={{ color: 'var(--ip-text)' }}
                >
                  View Details
                </button>
                <button
                  onClick={() => { onDelete(topic.id); setMenuOpen(false) }}
                  className="w-full text-left px-3 py-2 hover:bg-[var(--ip-bg-subtle)] transition-colors"
                  style={{ color: 'var(--ip-error)' }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <h4
        className="text-sm font-semibold mb-2 leading-snug"
        style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}
      >
        {topic.title}
      </h4>

      {topic.pillars && topic.pillars.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {topic.pillars.slice(0, 3).map(pillar => (
            <span
              key={pillar}
              className="text-[10px] font-medium px-2 py-0.5"
              style={{
                background: 'var(--ip-bg-subtle)',
                color: 'var(--ip-text-tertiary)',
                borderRadius: 'var(--ip-radius-full)',
                border: '1px solid var(--ip-border-subtle)',
              }}
            >
              {pillar}
            </span>
          ))}
        </div>
      )}

      {topic.engagement && (
        <div className="flex items-center gap-1 mb-1">
          <ArrowUpRight size={10} style={{ color: 'var(--ip-success)' }} />
          <span className="text-[10px] font-medium" style={{ color: 'var(--ip-success)' }}>
            {topic.engagement}
          </span>
        </div>
      )}

      <div className="flex items-center gap-1 mt-2">
        <Clock size={9} style={{ color: 'var(--ip-text-tertiary)' }} />
        <span className="text-[10px]" style={{ color: 'var(--ip-text-tertiary)' }}>
          {timeAgo(topic.created_at)}
        </span>
      </div>
    </div>
  )
}

// --- Kanban Column ------------------------------------------------------------

function KanbanColumn({
  title, topics, color, onSelect, onDelete, onAdd,
}: {
  title: string
  topics: Topic[]
  color: string
  onSelect: (t: Topic) => void
  onDelete: (id: string) => void
  onAdd?: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}>
            {title}
          </h3>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5"
            style={{ background: 'var(--ip-bg-subtle)', color: 'var(--ip-text-tertiary)', borderRadius: 'var(--ip-radius-full)' }}
          >
            {topics.length}
          </span>
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            className="w-5 h-5 flex items-center justify-center transition-colors hover:bg-[var(--ip-bg-subtle)]"
            style={{ borderRadius: 'var(--ip-radius-full)', color: 'var(--ip-text-tertiary)' }}
          >
            <Plus size={12} />
          </button>
        )}
      </div>

      {topics.map(topic => (
        <TopicCard key={topic.id} topic={topic} onSelect={onSelect} onDelete={onDelete} />
      ))}

      {topics.length === 0 && (
        <div
          className="py-10 text-center"
          style={{
            border: '1px dashed var(--ip-border-subtle)',
            borderRadius: 'var(--ip-radius-lg)',
          }}
        >
          <p className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
            {title === 'Discovered' ? 'Click AI Discover to find topics' : 'Topics appear here as they progress'}
          </p>
        </div>
      )}
    </div>
  )
}

// --- Main Page ----------------------------------------------------------------

export function Topics() {
  const [viewMode, setViewMode] = useState<ViewMode>('kanban')
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)
  const [showDiscoverModal, setShowDiscoverModal] = useState(false)
  const queryClient = useQueryClient()

  const { data: topics = [], isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: getTopics,
  })

  const createMutation = useMutation({
    mutationFn: () => createTopic({ title: 'New Topic', category: 'GENERAL' }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['topics'] }); toast.success('Topic created') },
    onError: () => toast.error('Failed to create topic'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTopic,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['topics'] }); toast.success('Topic deleted') },
    onError: () => toast.error('Failed to delete topic'),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      updateTopic(id, { status: status as Topic['status'] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['topics'] }),
    onError: () => toast.error('Failed to update topic'),
  })

  const generateMutation = useMutation({
    mutationFn: generateTopics,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      setShowDiscoverModal(false)
      toast.success('Topics generated!')
    },
    onError: () => toast.error('Failed to generate topics'),
  })

  const discoveredTopics = topics.filter(t =>
    t.status === 'new' || t.status === 'discovered' || t.status === 'scored' || t.status === 'analyzed' || t.status === 'passed'
  )
  const developingTopics = topics.filter(t => t.status === 'developing')
  const scriptedTopics = topics.filter(t => t.status === 'scripted' || t.status === 'published')

  function handleDiscover(niche: string, keywords: string, platform: string) {
    const kws = keywords.split(',').map(k => k.trim()).filter(Boolean)
    generateMutation.mutate({ niche: niche || undefined, keywords: kws, platform })
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-6">
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
            Influencer Pirates
          </span>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
          >
            Topic Laboratory
          </h1>
        </div>

        <button
          onClick={() => setShowDiscoverModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          style={{
            background: 'var(--ip-primary-gradient)',
            color: '#fff',
            borderRadius: 'var(--ip-radius-md)',
            boxShadow: 'var(--ip-shadow-md)',
          }}
        >
          <Sparkles size={14} />
          AI Discover
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className="flex items-center p-1"
          style={{
            background: 'var(--ip-bg-subtle)',
            borderRadius: 'var(--ip-radius-full)',
            border: '1px solid var(--ip-border-subtle)',
          }}
        >
          {(['kanban', 'table'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="px-4 py-1.5 text-xs font-medium transition-all capitalize"
              style={{
                borderRadius: 'var(--ip-radius-full)',
                background: viewMode === mode ? 'var(--ip-surface)' : 'transparent',
                color: viewMode === mode ? 'var(--ip-text)' : 'var(--ip-text-tertiary)',
                boxShadow: viewMode === mode ? 'var(--ip-shadow-sm)' : 'none',
              }}
            >
              {mode}
            </button>
          ))}
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
          {isLoading ? 'Loading...' : `${topics.length} topics`}
        </span>

        {generateMutation.isPending && (
          <div className="flex items-center gap-2">
            <Loader2 size={13} className="animate-spin" style={{ color: 'var(--ip-primary)' }} />
            <span className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>Discovering topics...</span>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--ip-primary)' }} />
        </div>
      )}

      {/* Kanban View */}
      {!isLoading && viewMode === 'kanban' && (
        <div className="grid grid-cols-3 gap-6">
          <KanbanColumn
            title="Discovered"
            topics={discoveredTopics}
            color="#6366f1"
            onSelect={setSelectedTopic}
            onDelete={id => deleteMutation.mutate(id)}
            onAdd={() => createMutation.mutate()}
          />
          <KanbanColumn
            title="Developing"
            topics={developingTopics}
            color="#f59e0b"
            onSelect={setSelectedTopic}
            onDelete={id => deleteMutation.mutate(id)}
          />
          <KanbanColumn
            title="Scripted"
            topics={scriptedTopics}
            color="#10b981"
            onSelect={setSelectedTopic}
            onDelete={id => deleteMutation.mutate(id)}
          />
        </div>
      )}

      {/* Table View */}
      {!isLoading && viewMode === 'table' && (
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
                {['TOPIC', 'CATEGORY', 'SCORE', 'STATUS', 'CREATED'].map(h => (
                  <th
                    key={h}
                    className="text-left py-3 px-2 text-xs font-semibold"
                    style={{ color: 'var(--ip-text-tertiary)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topics.map(topic => {
                const color = categoryColor(topic.category)
                return (
                  <tr
                    key={topic.id}
                    className="transition-colors hover:bg-[var(--ip-bg-subtle)] cursor-pointer"
                    style={{ borderBottom: '1px solid var(--ip-border-subtle)' }}
                    onClick={() => setSelectedTopic(topic)}
                  >
                    <td className="py-3 px-2 font-medium" style={{ color: 'var(--ip-text)' }}>
                      {topic.title}
                    </td>
                    <td className="py-3 px-2">
                      <span
                        className="text-[10px] font-bold tracking-widest px-2 py-0.5"
                        style={{
                          color,
                          background: `color-mix(in srgb, ${color} 12%, transparent)`,
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
                      {topic.status}
                    </td>
                    <td className="py-3 px-2 text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
                      {timeAgo(topic.created_at)}
                    </td>
                  </tr>
                )
              })}
              {topics.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-16 text-center" style={{ color: 'var(--ip-text-tertiary)' }}>
                    <div className="flex flex-col items-center gap-3">
                      <Sparkles size={24} style={{ opacity: 0.3 }} />
                      <p className="text-sm">No topics yet - click AI Discover to generate ideas</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showDiscoverModal && (
        <DiscoverModal
          onClose={() => setShowDiscoverModal(false)}
          onSubmit={handleDiscover}
          isPending={generateMutation.isPending}
        />
      )}

      {selectedTopic && (
        <TopicDetailModal
          topic={selectedTopic}
          onClose={() => setSelectedTopic(null)}
          onDelete={id => { deleteMutation.mutate(id); setSelectedTopic(null) }}
          onStatusChange={(id, status) => updateStatusMutation.mutate({ id, status })}
        />
      )}
    </div>
  )
}
