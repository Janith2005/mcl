import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/api/supabase'
import { useAuth } from '@/lib/auth'
import { api } from '@/api/client'
import { setWorkspaceId } from '@/lib/workspace'

const niches = [
  { label: 'Tech', emoji: '💻' },
  { label: 'Finance', emoji: '💰' },
  { label: 'Lifestyle', emoji: '🌿' },
  { label: 'Fitness', emoji: '💪' },
]

const platforms = ['YouTube', 'Instagram', 'TikTok', 'LinkedIn', 'X/Twitter']

export function Onboarding() {
  const navigate = useNavigate()
  const { session, refreshWorkspace } = useAuth()

  // If already authenticated, skip the email step
  const [step, setStep] = useState(session ? 1 : 0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [name, setName] = useState('')
  const [niche, setNiche] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  function togglePlatform(p: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    )
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailLoading(true)
    setEmailError('')
    const { error } = await supabase.auth.signUp({ email, password })
    setEmailLoading(false)
    if (error) {
      setEmailError(error.message)
    } else {
      setStep(1)
    }
  }

  async function handleNext() {
    if (step < 3) {
      setStep(step + 1)
      return
    }
    // Final step — create workspace
    const workspaceName = name || 'My Workspace'
    const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    try {
      const ws = await api<{ id: string }>('/api/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: workspaceName, slug, default_niche: niche }),
      })
      if (ws?.id) setWorkspaceId(ws.id)
    } catch {
      // Workspace may already exist — still proceed
    }
    await refreshWorkspace()
    navigate('/')
  }

  const totalSteps = 3
  const profileStep = step - 1 // 0-indexed for steps 1-3

  const cardStyle: React.CSSProperties = {
    background: 'var(--ip-surface-glass)',
    backdropFilter: 'blur(var(--ip-glass-blur))',
    borderRadius: 'var(--ip-radius-xl)',
    boxShadow: 'var(--ip-shadow-lg)',
    border: '1px solid var(--ip-border-subtle)',
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid var(--ip-border)',
    borderRadius: 'var(--ip-radius-md)',
    background: 'var(--ip-surface)',
    color: 'var(--ip-text)',
  }

  // ── Step 0: Email signup ──────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ip-bg)' }}>
        <div className="w-full max-w-lg p-8" style={cardStyle}>
          <p className="text-xs tracking-widest mb-1" style={{ color: 'var(--ip-text-tertiary)' }}>
            STEP 00
          </p>
          <h1 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
            Create Your Account
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--ip-text-secondary)' }}>
            We'll send a magic link to your email — no password needed.
          </p>

          <form onSubmit={handleEmailSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@luminous-lab.io"
              required
              className="w-full py-3 px-4 text-sm outline-none mb-3"
              style={inputStyle}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 characters)"
              required
              minLength={6}
              className="w-full py-3 px-4 text-sm outline-none mb-4"
              style={inputStyle}
            />
            {emailError && (
              <p className="text-xs mb-3" style={{ color: 'var(--ip-error)' }}>{emailError}</p>
            )}
            <button
              type="submit"
              disabled={emailLoading}
              className="w-full py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
            >
              {emailLoading ? 'Creating account…' : '⚡ Create Account'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--ip-text-secondary)' }}>
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="font-medium underline" style={{ color: 'var(--ip-text-brand)' }}>
              Sign in
            </button>
          </p>
        </div>
      </div>
    )
  }

  // ── Steps 1-3: Profile setup ──────────────────────────────────────────────
  const stepTitles = ["What's Your Name?", 'Identify Your Niche', 'Where Do You Post?']

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--ip-bg)' }}>
      <div className="w-full max-w-lg p-8" style={cardStyle}>
        <p className="text-xs tracking-widest mb-1" style={{ color: 'var(--ip-text-tertiary)' }}>
          STEP 0{step}
        </p>
        <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
          {stepTitles[profileStep]}
          <span className="text-sm ml-2" style={{ color: 'var(--ip-text-tertiary)' }}>
            {profileStep + 1}/{totalSteps}
          </span>
        </h1>

        {step === 1 && (
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Captain Vane"
            className="w-full py-3 px-4 text-sm outline-none"
            style={inputStyle}
          />
        )}

        {step === 2 && (
          <>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. Scaling AI startups, stoic philosophy..."
              className="w-full py-3 px-4 text-sm outline-none mb-4"
              style={inputStyle}
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

        {step === 3 && (
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
            style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
          >
            {step < 3 ? 'Continue →' : 'Generate My Strategy →'}
          </button>
          {step > 1 && (
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
