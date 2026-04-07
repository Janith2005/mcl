import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/api/supabase'
import { useAuth } from '@/lib/auth'
import { api } from '@/api/client'
import { setWorkspaceId } from '@/lib/workspace'
import { Check, Cpu, Dumbbell, Landmark, Leaf, Sparkles } from 'lucide-react'
import { shouldBypassAuth } from '@/lib/runtime'

const DEV_SKIP_AUTH = shouldBypassAuth()

const niches = [
  { label: 'Tech', icon: Cpu },
  { label: 'Finance', icon: Landmark },
  { label: 'Lifestyle', icon: Leaf },
  { label: 'Fitness', icon: Dumbbell },
]

const platforms = ['YouTube', 'Instagram', 'TikTok', 'LinkedIn', 'X/Twitter']

export function Onboarding() {
  const navigate = useNavigate()
  const { session, refreshWorkspace } = useAuth()

  const [step, setStep] = useState(session || DEV_SKIP_AUTH ? 1 : 0)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [finalError, setFinalError] = useState('')
  const [name, setName] = useState('')
  const [niche, setNiche] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  function togglePlatform(platform: string) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((item) => item !== platform) : [...prev, platform],
    )
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEmailLoading(true)
    setEmailError('')
    const { data, error } = await supabase.auth.signUp({ email, password })
    setEmailLoading(false)

    if (error) {
      setEmailError(error.message)
      return
    }

    // Supabase can return no session when email confirmation is required.
    // Try an immediate sign-in; if still no session, stop here with a clear message.
    if (!data.session && !DEV_SKIP_AUTH) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setEmailError('Please verify your email and sign in from the Login page, then continue setup.')
        return
      }
    }

    setStep(1)
  }

  async function handleNext() {
    setFinalError('')
    if (step < 3) {
      setStep(step + 1)
      return
    }

    if (!DEV_SKIP_AUTH) {
      const { data: current } = await supabase.auth.getSession()
      if (!current.session) {
        setFinalError('Your session expired. Please sign in again to finish setup.')
        navigate('/login')
        return
      }
    }

    const workspaceName = name || 'My Workspace'
    const slug = workspaceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    try {
      const ws = await api<{ id: string }>('/api/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify({ name: workspaceName, slug, default_niche: niche }),
      })
      if (ws?.id) setWorkspaceId(ws.id)
    } catch {
      // Workspace may already exist; continue to app.
    }

    await refreshWorkspace()
    navigate('/')
  }

  const totalSteps = 3
  const profileStep = step - 1
  const progressPercent = step === 0 ? 8 : Math.round(((profileStep + 1) / totalSteps) * 100)

  const cardStyle: React.CSSProperties = {
    background: 'var(--ip-card-glass-bg)',
    backdropFilter: 'blur(var(--ip-card-glass-blur))',
    borderRadius: 'var(--ip-radius-xl)',
    border: '1px solid var(--ip-card-glass-border)',
    boxShadow: 'var(--ip-shadow-lg)',
  }

  const inputStyle: React.CSSProperties = {
    border: '1px solid var(--ip-border)',
    borderRadius: 'var(--ip-radius-md)',
    background: 'var(--ip-surface)',
    color: 'var(--ip-text)',
  }

  const stepTitles = ["What's your name?", 'Select your niche', 'Where do you publish?']

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--ip-bg-gradient)' }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in srgb, var(--ip-border-subtle) 55%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--ip-border-subtle) 55%, transparent) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          opacity: 0.13,
        }}
      />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-xl p-7 md:p-8" style={cardStyle}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold mb-4" style={{ background: 'var(--ip-surface)', border: '1px solid var(--ip-border-subtle)', borderRadius: 'var(--ip-radius-full)', color: 'var(--ip-primary)' }}>
            <Sparkles size={12} />
            Influencer Pirates Setup
          </div>

          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-1" style={{ color: 'var(--ip-text-tertiary)' }}>
              {step === 0 ? 'Account setup' : `Step 0${step} of 03`}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}>
              {step === 0 ? 'Create your account' : stepTitles[profileStep]}
            </h1>
            <div className="mt-4 h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'var(--ip-border-subtle)' }}>
              <div className="h-full rounded-full" style={{ width: `${progressPercent}%`, background: 'var(--ip-primary-gradient)' }} />
            </div>
          </div>

          {step === 0 && (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full py-3 px-4 text-sm outline-none"
                style={inputStyle}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (minimum 6 characters)"
                required
                minLength={6}
                className="w-full py-3 px-4 text-sm outline-none"
                style={inputStyle}
              />

              {emailError && (
                <p className="text-xs" style={{ color: 'var(--ip-error)' }}>
                  {emailError}
                </p>
              )}

              <button
                type="submit"
                disabled={emailLoading}
                className="w-full py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
              >
                {emailLoading ? 'Creating account...' : 'Continue'}
              </button>
            </form>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your workspace name"
                className="w-full py-3 px-4 text-sm outline-none"
                style={inputStyle}
              />
              <p className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
                This name appears in your dashboard and settings.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <input
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g. AI marketing for SaaS founders"
                className="w-full py-3 px-4 text-sm outline-none"
                style={inputStyle}
              />

              <div className="grid grid-cols-2 gap-2">
                {niches.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => setNiche(label)}
                    className="flex items-center gap-2 py-3 px-3 text-sm font-medium"
                    style={{
                      border: niche === label ? '1px solid var(--ip-primary)' : '1px solid var(--ip-border-subtle)',
                      borderRadius: 'var(--ip-radius-md)',
                      background: niche === label ? 'color-mix(in srgb, var(--ip-primary) 10%, white)' : 'var(--ip-surface)',
                      color: niche === label ? 'var(--ip-primary)' : 'var(--ip-text-secondary)',
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              {platforms.map((platform) => {
                const active = selectedPlatforms.includes(platform)
                return (
                  <button
                    key={platform}
                    onClick={() => togglePlatform(platform)}
                    className="w-full flex items-center justify-between py-3 px-4 text-sm"
                    style={{
                      border: active ? '1px solid var(--ip-primary)' : '1px solid var(--ip-border-subtle)',
                      borderRadius: 'var(--ip-radius-md)',
                      background: active ? 'color-mix(in srgb, var(--ip-primary) 10%, white)' : 'var(--ip-surface)',
                      color: active ? 'var(--ip-primary)' : 'var(--ip-text-secondary)',
                    }}
                  >
                    <span>{platform}</span>
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{
                        background: active ? 'var(--ip-primary)' : 'var(--ip-border-subtle)',
                        color: '#fff',
                      }}
                    >
                      {active ? <Check size={12} /> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {step > 0 && (
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={handleNext}
                className="flex-1 py-3 text-sm font-semibold text-white"
                style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
              >
                {step < 3 ? 'Continue' : 'Finish setup'}
              </button>
              {step > 1 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="px-5 py-3 text-sm"
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
          )}

          {finalError && (
            <p className="text-xs mt-3" style={{ color: 'var(--ip-error)' }}>
              {finalError}
            </p>
          )}

          {step === 0 && (
            <p className="text-sm text-center mt-6" style={{ color: 'var(--ip-text-secondary)' }}>
              Already have an account?{' '}
              <button onClick={() => navigate('/login')} className="font-semibold" style={{ color: 'var(--ip-primary)' }}>
                Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
