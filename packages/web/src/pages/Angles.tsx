import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { ArrowRightLeft, ArrowRight, Bookmark, Loader2, Sparkles } from 'lucide-react'
import { getAngles, saveAngle, generateAngles, type Angle } from '@/api/services'

type Tab = 'angles-lab' | 'drafts' | 'published'
type FormatTab = 'longform' | 'shortform' | 'linkedin-twitter'

function getStrengthColor(level: 'high' | 'medium' | 'low'): string {
  if (level === 'high') return 'var(--ip-success)'
  if (level === 'medium') return 'var(--ip-warning)'
  return 'var(--ip-error)'
}

const cardStyle: React.CSSProperties = {
  background: 'var(--ip-card-glass-bg)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderRadius: 'var(--ip-radius-lg)',
  boxShadow: 'var(--ip-shadow-md)',
  border: '1px solid var(--ip-border-subtle)',
}

function AngleCard({ angle }: { angle: Angle }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const saveMutation = useMutation({
    mutationFn: () => saveAngle(angle.id, { title: angle.title }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['angles'] }),
  })

  return (
    <div className="p-5 transition-all hover:translate-y-[-2px]" style={cardStyle}>
      <span
        className="inline-block text-[10px] font-bold tracking-widest px-3 py-1 mb-3"
        style={{
          color: angle.badge_color,
          background: angle.badge_bg,
          borderRadius: 'var(--ip-radius-full)',
        }}
      >
        {angle.badge}
      </span>

      <h3
        className="text-base font-bold mb-2 leading-snug"
        style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
      >
        {angle.title}
      </h3>

      <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--ip-text-secondary)' }}>
        {angle.description}
      </p>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span
            className="text-[10px] font-bold tracking-widest"
            style={{ color: getStrengthColor(angle.strength_level) }}
          >
            {angle.strength_label}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ip-border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${angle.strength_percent}%`,
              background: getStrengthColor(angle.strength_level),
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--ip-text-secondary)' }}
        >
          {saveMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
          Save
        </button>
        <button
          onClick={() => navigate('/scripts')}
          className="flex items-center gap-1 text-xs font-medium transition-colors hover:opacity-80"
          style={{ color: 'var(--ip-text-brand)' }}
        >
          Edit Draft <ArrowRight size={12} />
        </button>
      </div>
    </div>
  )
}

export function Angles() {
  const [activeTab, setActiveTab] = useState<Tab>('angles-lab')
  const [formatTab, setFormatTab] = useState<FormatTab>('longform')
  const [commonBelief, setCommonBelief] = useState('')
  const [surprisingTruth, setSurprisingTruth] = useState('')

  const { data: angles = [], isLoading } = useQuery({
    queryKey: ['angles'],
    queryFn: getAngles,
  })

  const generateMutation = useMutation({
    mutationFn: () => generateAngles({
      common_belief: commonBelief,
      surprising_truth: surprisingTruth,
      format: formatTab,
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['angles'] }),
  })

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

  const draftAngles = angles.filter((a: Angle & { status?: string }) => a.status === 'draft')
  const publishedAngles = angles.filter((a: Angle & { status?: string }) => a.status === 'published')

  return (
    <div>
      <div className="mb-2">
        <p className="text-[10px] font-bold tracking-widest mb-1 uppercase" style={{ color: 'var(--ip-text-brand)' }}>
          ACTIVE FOCUS
        </p>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
            Niche Authority in AI
          </h1>
          <button
            className="px-4 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
          >
            Save Topic
          </button>
        </div>
      </div>

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
          <div className="p-6 mb-6" style={cardStyle}>
            <div className="flex items-center gap-2 mb-4">
              <Bookmark size={18} style={{ color: 'var(--ip-text)' }} />
              <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
                The Contrast Formula
              </h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>
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

              <div className="flex-1">
                <p className="text-[10px] font-bold tracking-widest mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>
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

          <div className="flex items-center justify-between mb-4">
            <div
              className="inline-flex items-center p-1"
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
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !commonBelief || !surprisingTruth}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
            >
              {generateMutation.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Generating...</>
                : <><Sparkles size={14} /> Generate Angles</>}
            </button>
          </div>

          {isLoading || generateMutation.isPending ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--ip-primary)' }} />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {angles.map((angle) => (
                <AngleCard key={angle.id} angle={angle} />
              ))}
              {angles.length === 0 && (
                <div className="col-span-2 text-center py-12" style={{ color: 'var(--ip-text-tertiary)' }}>
                  No angles generated yet. Use the Contrast Formula above to get started.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === 'drafts' && (
        <div className="p-8" style={cardStyle}>
          {draftAngles.length === 0 ? (
            <p className="text-sm text-center" style={{ color: 'var(--ip-text-tertiary)' }}>
              Your drafted angles will appear here once you start editing.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {draftAngles.map((angle) => (
                <AngleCard key={angle.id} angle={angle} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'published' && (
        <div className="p-8" style={cardStyle}>
          {publishedAngles.length === 0 ? (
            <p className="text-sm text-center" style={{ color: 'var(--ip-text-tertiary)' }}>
              Published angles will appear here after you finalize and ship content.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-6">
              {publishedAngles.map((angle) => (
                <AngleCard key={angle.id} angle={angle} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
