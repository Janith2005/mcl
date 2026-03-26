import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const steps = [
  { title: "What's Your Name?", subtitle: 'Step 01', field: 'name' },
  { title: 'Identify Your Niche', subtitle: 'Step 02', field: 'niche' },
  { title: 'Where Do You Post?', subtitle: 'Step 03', field: 'platforms' },
]

const niches = [
  { label: 'Tech', emoji: '💻' },
  { label: 'Finance', emoji: '💰' },
  { label: 'Lifestyle', emoji: '🌿' },
  { label: 'Fitness', emoji: '💪' },
]

const platforms = ['YouTube', 'Instagram', 'TikTok', 'LinkedIn', 'X/Twitter']

export function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [niche, setNiche] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    )
  }

  function handleNext() {
    if (step < 2) {
      setStep(step + 1)
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ip-bg)' }}>
      <div
        className="w-full max-w-lg p-8"
        style={{
          background: 'var(--ip-surface-glass)',
          backdropFilter: `blur(var(--ip-glass-blur))`,
          borderRadius: 'var(--ip-radius-xl)',
          boxShadow: 'var(--ip-shadow-lg)',
          border: '1px solid var(--ip-border-subtle)',
        }}
      >
        <p className="text-xs tracking-widest mb-1" style={{ color: 'var(--ip-text-tertiary)' }}>
          {steps[step].subtitle}
        </p>
        <h1
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
        >
          {steps[step].title}
          <span className="text-sm ml-2" style={{ color: 'var(--ip-text-tertiary)' }}>
            {step + 1}/3
          </span>
        </h1>

        {step === 0 && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Captain Vane"
            className="w-full py-3 px-4 text-sm outline-none"
            style={{
              border: '1px solid var(--ip-border)',
              borderRadius: 'var(--ip-radius-md)',
              background: 'var(--ip-surface)',
            }}
          />
        )}

        {step === 1 && (
          <>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. Scaling AI startups, stoic philosophy..."
              className="w-full py-3 px-4 text-sm outline-none mb-4"
              style={{
                border: '1px solid var(--ip-border)',
                borderRadius: 'var(--ip-radius-md)',
                background: 'var(--ip-surface)',
              }}
            />
            <p className="text-xs font-medium mb-3" style={{ color: 'var(--ip-text-tertiary)' }}>
              INTEREST CLUSTERS <span className="ml-2 opacity-60">MULTI-SELECT</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              {niches.map(({ label, emoji }) => (
                <button
                  key={label}
                  onClick={() => setNiche(label)}
                  className="flex items-center gap-2 py-3 px-4 text-sm font-medium transition-all"
                  style={{
                    border: niche === label ? '2px solid var(--ip-primary)' : '1px solid var(--ip-border)',
                    borderRadius: 'var(--ip-radius-md)',
                    background: niche === label ? 'var(--ip-bg-subtle)' : 'var(--ip-surface)',
                    color: 'var(--ip-text)',
                  }}
                >
                  {emoji} {label}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <div className="space-y-2">
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className="w-full flex items-center gap-3 py-3 px-4 text-sm font-medium text-left transition-all"
                style={{
                  border: selectedPlatforms.includes(p) ? '2px solid var(--ip-primary)' : '1px solid var(--ip-border)',
                  borderRadius: 'var(--ip-radius-md)',
                  background: selectedPlatforms.includes(p) ? 'var(--ip-bg-subtle)' : 'var(--ip-surface)',
                  color: 'var(--ip-text)',
                }}
              >
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-xs"
                  style={{
                    background: selectedPlatforms.includes(p) ? 'var(--ip-primary)' : 'var(--ip-border)',
                    color: selectedPlatforms.includes(p) ? 'white' : 'transparent',
                  }}
                >
                  ✓
                </div>
                {p}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleNext}
            className="flex-1 py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{
              background: 'var(--ip-primary-gradient)',
              borderRadius: 'var(--ip-radius-full)',
            }}
          >
            {step < 2 ? 'Continue →' : 'Generate My Strategy →'}
          </button>
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 text-sm font-medium"
              style={{
                border: '1px solid var(--ip-border)',
                borderRadius: 'var(--ip-radius-full)',
                color: 'var(--ip-text-secondary)',
              }}
            >
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
