import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/api/supabase'
import { useAuth } from '@/lib/auth'
import { ArrowRight, CircleCheck, Gauge, ShieldCheck, Sparkles } from 'lucide-react'
import { shouldBypassAuth } from '@/lib/runtime'

const DEV_SKIP_AUTH = shouldBypassAuth()

const featureBullets = [
  'One connected pipeline from idea to publish',
  'Fast workflow with guided AI actions',
  'Live performance feedback and iteration loop',
]

const proofCards = [
  { label: 'Content Velocity', value: '10x' },
  { label: 'Execution Speed', value: '75%' },
  { label: 'Active Pipelines', value: '24/7' },
]

export function Login() {
  const navigate = useNavigate()
  const { session, hasWorkspace, loading: authLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (DEV_SKIP_AUTH) {
      if (!authLoading && hasWorkspace) {
        navigate('/', { replace: true })
      }
      return
    }

    if (session) navigate('/', { replace: true })
  }, [session, authLoading, hasWorkspace, navigate])

  async function handleEmailPassword(e: React.FormEvent) {
    e.preventDefault()
    if (DEV_SKIP_AUTH) {
      navigate('/', { replace: true })
      return
    }

    setSubmitLoading(true)
    setMessage('')

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setMessage(error.message)
      } else if (!data.session) {
        setMessage('Check your inbox to confirm your account.')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
    }

    setSubmitLoading(false)
  }

  async function handleGoogle() {
    if (DEV_SKIP_AUTH) {
      navigate('/', { replace: true })
      return
    }

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--ip-bg-gradient)' }}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in srgb, var(--ip-border-subtle) 52%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--ip-border-subtle) 52%, transparent) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          opacity: 0.14,
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-10 md:py-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="self-center">
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 text-xs font-semibold"
              style={{
                borderRadius: 'var(--ip-radius-full)',
                background: 'var(--ip-surface)',
                border: '1px solid var(--ip-border-subtle)',
                color: 'var(--ip-primary)',
              }}
            >
              <Sparkles size={12} />
              Influencer Pirates Platform
            </div>

            <h1
              className="text-4xl md:text-5xl font-bold leading-tight"
              style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}
            >
              Launch 10x more content.
              <br />
              75% faster.
            </h1>
            <p className="mt-4 max-w-xl text-sm md:text-base" style={{ color: 'var(--ip-text-secondary)' }}>
              Ship better content with a connected AI workflow inspired by fast-moving growth teams.
            </p>

            <div className="mt-6 space-y-2">
              {featureBullets.map((bullet) => (
                <div key={bullet} className="flex items-center gap-2 text-sm" style={{ color: 'var(--ip-text-secondary)' }}>
                  <CircleCheck size={14} style={{ color: 'var(--ip-success)' }} />
                  {bullet}
                </div>
              ))}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {proofCards.map((card) => (
                <div
                  key={card.label}
                  className="p-4"
                  style={{
                    borderRadius: 'var(--ip-radius-lg)',
                    background: 'var(--ip-card-glass-bg)',
                    border: '1px solid var(--ip-card-glass-border)',
                    boxShadow: 'var(--ip-card-glass-shadow)',
                  }}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--ip-text-tertiary)' }}>
                    {card.label}
                  </p>
                  <p className="text-2xl font-bold" style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}>
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-5 text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
              <div className="inline-flex items-center gap-1.5">
                <ShieldCheck size={12} />
                Secure auth
              </div>
              <div className="inline-flex items-center gap-1.5">
                <Gauge size={12} />
                Live performance
              </div>
            </div>
          </section>

          <section
            className="p-7 md:p-8"
            style={{
              borderRadius: 'var(--ip-radius-xl)',
              background: 'var(--ip-card-glass-bg)',
              border: '1px solid var(--ip-card-glass-border)',
              boxShadow: 'var(--ip-shadow-lg)',
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] font-semibold" style={{ color: 'var(--ip-text-tertiary)' }}>
              Welcome
            </p>
            <h2
              className="text-2xl font-bold mt-1"
              style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}
            >
              {isSignUp ? 'Create your account' : 'Sign in to your workspace'}
            </h2>
            <p className="text-sm mt-2 mb-5" style={{ color: 'var(--ip-text-secondary)' }}>
              {isSignUp ? 'Get started in less than a minute.' : 'Continue your pipeline where you left off.'}
            </p>
            {DEV_SKIP_AUTH && (
              <p className="text-xs mb-4" style={{ color: 'var(--ip-text-tertiary)' }}>
                Local dev mode is active. Authentication is bypassed; continue directly into the app.
              </p>
            )}

            <div
              className="flex items-center p-1 mb-4"
              style={{
                background: 'var(--ip-bg-subtle)',
                borderRadius: 'var(--ip-radius-full)',
                border: '1px solid var(--ip-border-subtle)',
              }}
            >
              {(['Sign In', 'Sign Up'] as const).map((label, index) => (
                <button
                  key={label}
                  onClick={() => {
                    setIsSignUp(index === 1)
                    setMessage('')
                  }}
                  className="flex-1 py-2 text-sm font-medium transition-all"
                  style={{
                    borderRadius: 'var(--ip-radius-full)',
                    background: isSignUp === (index === 1) ? 'var(--ip-surface)' : 'transparent',
                    color: isSignUp === (index === 1) ? 'var(--ip-text)' : 'var(--ip-text-tertiary)',
                    boxShadow: isSignUp === (index === 1) ? 'var(--ip-shadow-sm)' : 'none',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <button
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium mb-4"
              style={{
                borderRadius: 'var(--ip-radius-full)',
                border: '1px solid var(--ip-border)',
                background: 'var(--ip-surface)',
                color: 'var(--ip-text)',
              }}
            >
              {DEV_SKIP_AUTH ? 'Open App' : 'Continue with Google'}
              <ArrowRight size={14} />
            </button>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px" style={{ background: 'var(--ip-border)' }} />
              <span className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>OR</span>
              <div className="flex-1 h-px" style={{ background: 'var(--ip-border)' }} />
            </div>

            <form onSubmit={handleEmailPassword} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                required
                className="w-full py-3 px-4 text-sm outline-none"
                style={{
                  borderRadius: 'var(--ip-radius-md)',
                  border: '1px solid var(--ip-border)',
                  background: 'var(--ip-surface)',
                  color: 'var(--ip-text)',
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                minLength={6}
                className="w-full py-3 px-4 text-sm outline-none"
                style={{
                  borderRadius: 'var(--ip-radius-md)',
                  border: '1px solid var(--ip-border)',
                  background: 'var(--ip-surface)',
                  color: 'var(--ip-text)',
                }}
              />

              <button
                type="submit"
                disabled={submitLoading}
                className="w-full py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{
                  borderRadius: 'var(--ip-radius-full)',
                  background: 'var(--ip-primary-gradient)',
                  boxShadow: 'var(--ip-shadow-md)',
                }}
              >
                {submitLoading ? 'Please wait...' : DEV_SKIP_AUTH ? 'Open app' : isSignUp ? 'Create account' : 'Sign in'}
              </button>
            </form>

            {message && (
              <p className="text-sm mt-3" style={{ color: 'var(--ip-text-brand)' }}>
                {message}
              </p>
            )}

            <p className="text-xs mt-4" style={{ color: 'var(--ip-text-tertiary)' }}>
              By continuing, you agree to our terms and privacy policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
