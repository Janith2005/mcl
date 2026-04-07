import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard,
  Compass,
  Diamond,
  Anchor,
  FileText,
  BarChart3,
  Brain,
  Settings,
  HelpCircle,
  Sparkles,
  Plus,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/topics', icon: Compass, label: 'Topics' },
  { to: '/angles', icon: Diamond, label: 'Angles' },
  { to: '/hooks', icon: Anchor, label: 'Hooks' },
  { to: '/scripts', icon: FileText, label: 'Scripts' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/brain', icon: Brain, label: 'Brain' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/support', icon: HelpCircle, label: 'Support' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const displayName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email?.split('@')[0]
    || 'Operator'

  return (
    <header
      className="fixed left-0 right-0 top-0 z-40"
      style={{
        background: 'var(--ip-sidebar-bg)',
        backdropFilter: 'blur(var(--ip-glass-blur))',
        borderBottom: '1px solid var(--ip-border-subtle)',
        boxShadow: 'var(--ip-shadow-sm)',
      }}
    >
      <div
        className="mx-auto px-5 py-3 flex items-center gap-4"
        style={{ maxWidth: 'calc(var(--ip-content-max) + 2.5rem)' }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 shrink-0"
          title="Go to dashboard"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold"
            style={{ background: 'var(--ip-primary-gradient)', boxShadow: 'var(--ip-shadow-md)' }}
          >
            IP
          </div>
          <div className="text-left">
            <p className="text-sm font-bold leading-tight" style={{ color: 'var(--ip-text)' }}>
              Influencer Pirates
            </p>
            <p className="text-[11px] leading-tight" style={{ color: 'var(--ip-text-tertiary)' }}>
              AI marketing workflow
            </p>
          </div>
        </button>

        <div className="min-w-0 flex-1 overflow-x-auto">
          <nav
            className="inline-flex items-center gap-1 p-1 min-w-max"
            style={{
              background: 'var(--ip-surface)',
              borderRadius: 'var(--ip-radius-full)',
              border: '1px solid var(--ip-border-subtle)',
            }}
          >
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all"
                style={({ isActive }) => ({
                  borderRadius: 'var(--ip-radius-full)',
                  background: isActive ? 'var(--ip-primary-gradient)' : 'transparent',
                  color: isActive ? 'var(--ip-sidebar-text-active)' : 'var(--ip-sidebar-text)',
                  boxShadow: isActive ? 'var(--ip-shadow-sm)' : 'none',
                })}
              >
                <Icon size={13} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate('/topics')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white"
            style={{
              background: 'var(--ip-primary-gradient)',
              borderRadius: 'var(--ip-radius-full)',
              boxShadow: 'var(--ip-shadow-md)',
            }}
          >
            <Plus size={12} />
            New Content
          </button>

          <div className="hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1.5" style={{ border: '1px solid var(--ip-border)', borderRadius: 'var(--ip-radius-full)', color: 'var(--ip-text-tertiary)' }}>
            <Sparkles size={12} style={{ color: 'var(--ip-primary)' }} />
            {displayName}
          </div>
        </div>
      </div>
    </header>
  )
}
