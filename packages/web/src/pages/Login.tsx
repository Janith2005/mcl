import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/api/supabase'
import { Skull, Shield, Hexagon } from 'lucide-react'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Check your email for the magic link!')
    }
    setLoading(false)
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--ip-bg-gradient)' }}
    >
      {/* Decorative orbs — top-left and top-right */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '40px',
          left: '40px',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          border: '1px solid var(--ip-border-subtle)',
          opacity: 0.5,
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: '30px',
          right: '60px',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          border: '1px solid var(--ip-border-subtle)',
          opacity: 0.45,
        }}
      />
      {/* Bottom-left subtle orb */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '80px',
          left: '60px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: '1px solid var(--ip-border-subtle)',
          opacity: 0.35,
        }}
      />

      {/* Brand above card */}
      <div className="text-center mb-8">
        <div
          className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ background: 'var(--ip-accent-maroon)' }}
        >
          <Skull size={28} color="white" />
        </div>
        <h1
          className="text-xl font-bold"
          style={{ color: 'var(--ip-text-brand)', fontFamily: 'var(--ip-font-display)' }}
        >
          Influence Pirates
        </h1>
        <p className="text-xs tracking-widest mt-1" style={{ color: 'var(--ip-text-tertiary)' }}>
          LUMINOUS LAB EDITION
        </p>
      </div>

      {/* Login Card — enhanced glassmorphic */}
      <div
        className="w-full max-w-md p-8 relative"
        style={{
          background: 'var(--ip-card-glass-bg)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 'var(--ip-radius-xl)',
          boxShadow: '0 12px 40px rgba(166, 102, 170, 0.10), 0 2px 8px rgba(166, 102, 170, 0.04)',
          border: '1px solid var(--ip-card-glass-border)',
        }}
      >
        {/* Welcome */}
        <h2
          className="text-2xl font-bold text-center mb-2"
          style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
        >
          Welcome back
        </h2>
        <p className="text-center text-sm mb-6" style={{ color: 'var(--ip-text-secondary)' }}>
          Enter the lab and synchronize your intel.
        </p>

        {/* Google */}
        <button
          onClick={handleGoogle}
          className="w-full py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 mb-4 transition-colors hover:bg-[var(--ip-bg-subtle)]"
          style={{
            border: '1px solid var(--ip-border)',
            borderRadius: 'var(--ip-radius-full)',
            color: 'var(--ip-text)',
            background: 'var(--ip-surface)',
          }}
        >
          <span style={{ color: 'var(--ip-primary)' }}>&#x2014;</span> Sign in with Google
        </button>

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px" style={{ background: 'var(--ip-border)' }} />
          <span className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>OR</span>
          <div className="flex-1 h-px" style={{ background: 'var(--ip-border)' }} />
        </div>

        {/* Magic Link */}
        <form onSubmit={handleMagicLink}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="agent@luminous-lab.io"
            required
            className="w-full py-3 px-4 text-sm mb-4 outline-none"
            style={{
              border: '1px solid var(--ip-border)',
              borderRadius: 'var(--ip-radius-full)',
              color: 'var(--ip-text)',
              background: 'var(--ip-surface)',
            }}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-sm font-semibold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{
              background: 'var(--ip-primary-gradient)',
              borderRadius: 'var(--ip-radius-full)',
              boxShadow: 'var(--ip-shadow-md)',
            }}
          >
            ⚡ Sign in with Magic Link
          </button>
        </form>

        {message && (
          <p className="text-center text-sm mt-4" style={{ color: 'var(--ip-text-brand)' }}>
            {message}
          </p>
        )}

        <p className="text-center text-sm mt-6" style={{ color: 'var(--ip-text-secondary)' }}>
          Don't have an account?{' '}
          <button onClick={() => navigate('/onboarding')} className="font-medium underline" style={{ color: 'var(--ip-text-brand)' }}>
            Sign up
          </button>
        </p>
      </div>

      {/* Footer badges */}
      <div className="flex items-center gap-6 mt-8">
        <span
          className="flex items-center gap-1.5 text-[10px] tracking-[0.15em] font-medium"
          style={{ color: 'var(--ip-text-tertiary)' }}
        >
          <Shield size={10} style={{ color: 'var(--ip-text-tertiary)' }} />
          END-TO-END INTEL
        </span>
        <span
          className="flex items-center gap-1.5 text-[10px] tracking-[0.15em] font-medium"
          style={{ color: 'var(--ip-text-tertiary)' }}
        >
          <Hexagon size={10} style={{ color: 'var(--ip-text-tertiary)' }} />
          HOLO-PRISM V4.2
        </span>
      </div>
    </div>
  )
}
