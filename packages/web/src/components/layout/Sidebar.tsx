import { NavLink } from 'react-router-dom'
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
]

const bottomItems = [
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/support', icon: HelpCircle, label: 'Support' },
]

export function Sidebar() {
  return (
    <aside
      className="flex flex-col h-screen fixed left-0 top-0 z-40"
      style={{
        width: 'var(--ip-sidebar-width)',
        background: 'var(--ip-sidebar-bg)',
        borderRight: '1px solid var(--ip-border-subtle)',
        boxShadow: 'var(--ip-shadow-md)',
      }}
    >
      {/* Brand */}
      <div className="px-5 py-5 flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
          style={{ background: 'var(--ip-primary-gradient)' }}
        >
          IP
        </div>
        <div>
          <div
            className="text-sm font-semibold leading-tight"
            style={{ color: 'var(--ip-text-brand)', fontFamily: 'var(--ip-font-display)' }}
          >
            Influence Pirates
          </div>
          <div className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
            The Luminous Lab
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive ? 'text-white shadow-md' : 'hover:bg-[var(--ip-bg-subtle)]'
              }`
            }
            style={({ isActive }) => ({
              borderRadius: isActive ? 'var(--ip-radius-full)' : 'var(--ip-radius-md)',
              background: isActive ? 'var(--ip-primary-gradient)' : undefined,
              color: isActive ? 'var(--ip-sidebar-text-active)' : 'var(--ip-sidebar-text)',
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* New Content CTA */}
      <div className="px-3 pb-2">
        <button
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
          style={{
            background: 'var(--ip-primary-gradient)',
            borderRadius: 'var(--ip-radius-full)',
          }}
        >
          <Plus size={16} />
          New Content
        </button>
      </div>

      {/* Bottom nav */}
      <div className="px-3 py-2 space-y-1" style={{ borderTop: '1px solid var(--ip-border-subtle)' }}>
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-[var(--ip-bg-subtle)]"
            style={({ isActive }) => ({
              borderRadius: 'var(--ip-radius-md)',
              color: isActive ? 'var(--ip-text-brand)' : 'var(--ip-sidebar-text)',
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}

        {/* User avatar */}
        <div className="flex items-center gap-3 px-3 py-2 mt-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'var(--ip-accent-maroon)' }}
          >
            CV
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--ip-text)' }}>
              Captain Vane
            </div>
            <div className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
              Pro Plan
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
