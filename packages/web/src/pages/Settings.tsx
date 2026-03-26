import { useState } from 'react'
import {
  Sparkles,
  Users,
  FileText,
  Key,
  Upload,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  Search,
  Bell,
  Settings as SettingsIcon,
  Anchor,
  CheckCircle,
} from 'lucide-react'

const tabs = ['Workspace', 'Team', 'Connections', 'API Keys', 'Billing'] as const
type Tab = (typeof tabs)[number]

interface CrewMember {
  name: string
  avatar: string
  role: 'ADMIN' | 'EDITOR' | 'MENTOR'
}

const crewMembers: CrewMember[] = [
  { name: 'Jack Sparrow', avatar: 'JS', role: 'ADMIN' },
  { name: 'Anna Bonny', avatar: 'AB', role: 'EDITOR' },
  { name: 'Blackbeard', avatar: 'BB', role: 'MENTOR' },
]

const roleBadgeStyles: Record<CrewMember['role'], { background: string }> = {
  ADMIN: { background: 'var(--ip-accent-plum)' },
  EDITOR: { background: 'var(--ip-info)' },
  MENTOR: { background: 'var(--ip-stage-discover)' },
}

interface ApiKeyEntry {
  name: string
  status: 'Active' | 'Unconfigured'
  maskedKey?: string
}

const apiKeys: ApiKeyEntry[] = [
  { name: 'OpenAI', status: 'Active', maskedKey: 'sk-...u9f2' },
  { name: 'Claude (Anthropic)', status: 'Unconfigured' },
  { name: 'Supabase', status: 'Active', maskedKey: 'ey...M3cx' },
]

interface PlatformConnection {
  platform: string
  handle: string
  connected: boolean
  lastSync?: string
  color: string
}

const platforms: PlatformConnection[] = [
  {
    platform: 'YouTube',
    handle: 'Luminous_VLOGS',
    connected: true,
    lastSync: 'Connected 3 days ago',
    color: '#FF0000',
  },
  {
    platform: 'TikTok',
    handle: 'PirateHacks_Official',
    connected: true,
    lastSync: 'Last fetch: 1h ago',
    color: '#000000',
  },
]

/* Shared glassmorphic card style */
const glassCard: React.CSSProperties = {
  background: 'var(--ip-card-glass-bg)',
  backdropFilter: 'blur(var(--ip-card-glass-blur))',
  WebkitBackdropFilter: 'blur(var(--ip-card-glass-blur))',
  borderRadius: 'var(--ip-radius-lg)',
  boxShadow: 'var(--ip-card-glass-shadow)',
  border: '1px solid var(--ip-card-glass-border)',
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('Workspace')
  const [workspaceName, setWorkspaceName] = useState('Influence Pirates Main Lab')
  const [defaultNiche, setDefaultNiche] = useState('B2B SaaS Growth')

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'transparent' }}>
      <div className="max-w-5xl mx-auto">
        {/* Top Bar: Search + Actions */}
        <div className="flex items-center justify-between mb-6">
          <div
            className="flex items-center gap-2 py-2 px-4 flex-1 max-w-xs"
            style={{
              background: 'var(--ip-surface)',
              border: '1px solid var(--ip-border-subtle)',
              borderRadius: 'var(--ip-radius-full)',
            }}
          >
            <Search size={14} style={{ color: 'var(--ip-text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search parameters..."
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-body)' }}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: 'var(--ip-surface)', border: '1px solid var(--ip-border-subtle)' }}
            >
              <Bell size={14} style={{ color: 'var(--ip-text-secondary)' }} />
            </button>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full"
              style={{ background: 'var(--ip-surface)', border: '1px solid var(--ip-border-subtle)' }}
            >
              <SettingsIcon size={14} style={{ color: 'var(--ip-text-secondary)' }} />
            </button>
            <button
              className="py-1.5 px-4 text-xs font-semibold flex items-center gap-2"
              style={{
                background: 'var(--ip-surface)',
                border: '1px solid var(--ip-border)',
                borderRadius: 'var(--ip-radius-full)',
                color: 'var(--ip-text)',
              }}
            >
              Invite Team
            </button>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'var(--ip-primary-gradient)', color: 'white' }}
            >
              CV
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-3xl md:text-4xl font-bold mb-1"
            style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
          >
            Settings
          </h1>
          <p className="text-sm" style={{ color: 'var(--ip-text-secondary)' }}>
            Configure your digital laboratory and manage your pirate crew.
          </p>
        </div>

        {/* Tab Bar — pill active state */}
        <div
          className="flex gap-1 p-1 mb-8 w-fit"
          style={{
            background: 'var(--ip-surface)',
            borderRadius: 'var(--ip-radius-full)',
            border: '1px solid var(--ip-border-subtle)',
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="py-2 px-4 text-xs font-medium transition-all"
              style={{
                borderRadius: 'var(--ip-radius-full)',
                background: activeTab === tab ? 'var(--ip-text)' : 'transparent',
                color: activeTab === tab ? 'var(--ip-text-on-primary)' : 'var(--ip-text-secondary)',
                boxShadow: activeTab === tab ? 'var(--ip-shadow-sm)' : 'none',
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Workspace Identity */}
          <div className="p-6" style={glassCard}>
            <div className="flex items-center gap-2 mb-5">
              <Sparkles size={16} style={{ color: 'var(--ip-primary)' }} />
              <h2
                className="text-base font-bold"
                style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
              >
                Workspace Identity
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  className="block text-[10px] tracking-widest font-semibold mb-1.5"
                  style={{ color: 'var(--ip-text-tertiary)' }}
                >
                  WORKSPACE NAME
                </label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full py-2.5 px-4 text-sm outline-none"
                  style={{
                    border: '1px solid var(--ip-border)',
                    borderRadius: 'var(--ip-radius-md)',
                    background: 'var(--ip-surface)',
                    color: 'var(--ip-text)',
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-[10px] tracking-widest font-semibold mb-1.5"
                  style={{ color: 'var(--ip-text-tertiary)' }}
                >
                  DEFAULT NICHE
                </label>
                <div className="relative">
                  <select
                    value={defaultNiche}
                    onChange={(e) => setDefaultNiche(e.target.value)}
                    className="w-full py-2.5 px-4 text-sm outline-none appearance-none cursor-pointer"
                    style={{
                      border: '1px solid var(--ip-border)',
                      borderRadius: 'var(--ip-radius-md)',
                      background: 'var(--ip-surface)',
                      color: 'var(--ip-text)',
                    }}
                  >
                    <option>B2B SaaS Growth</option>
                    <option>Creator Economy</option>
                    <option>Tech Education</option>
                    <option>Fitness & Wellness</option>
                  </select>
                  <ChevronDown
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--ip-text-tertiary)' }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Crew Members */}
          <div className="p-6" style={glassCard}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Anchor size={16} style={{ color: 'var(--ip-primary)' }} />
                <h2
                  className="text-base font-bold"
                  style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
                >
                  Crew Members
                </h2>
              </div>
              <button
                className="text-[10px] tracking-wider font-semibold py-1 px-3"
                style={{
                  color: 'var(--ip-primary)',
                  border: '1px solid var(--ip-border)',
                  borderRadius: 'var(--ip-radius-full)',
                }}
              >
                INVITE
              </button>
            </div>

            <div className="space-y-3">
              {crewMembers.map((member) => (
                <div key={member.name} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{
                      background: 'var(--ip-primary-gradient)',
                      color: 'white',
                    }}
                  >
                    {member.avatar}
                  </div>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--ip-text)' }}>
                    {member.name}
                  </span>
                  <span
                    className="text-[10px] tracking-wider font-bold py-0.5 px-2.5"
                    style={{
                      ...roleBadgeStyles[member.role],
                      color: 'white',
                      borderRadius: 'var(--ip-radius-full)',
                    }}
                  >
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Brand Voice Documents */}
          <div className="p-6" style={glassCard}>
            <div className="flex items-center gap-2 mb-3">
              <FileText size={16} style={{ color: 'var(--ip-primary)' }} />
              <h2
                className="text-base font-bold"
                style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
              >
                Brand Voice Documents
              </h2>
            </div>
            <p className="text-xs mb-4" style={{ color: 'var(--ip-text-secondary)' }}>
              Upload style guides, past successful scripts, or manifestos to train your
              AI Coach on your unique linguistic fingerprint.
            </p>

            {/* Upload area */}
            <div
              className="flex flex-col items-center justify-center p-6 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                border: '2px dashed var(--ip-border)',
                borderRadius: 'var(--ip-radius-md)',
                background: 'var(--ip-bg-subtle)',
              }}
            >
              <Upload size={20} style={{ color: 'var(--ip-text-tertiary)' }} className="mb-2" />
              <p className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
                Drop PDF or MD
              </p>
            </div>

            {/* Uploaded files */}
            <div className="space-y-2">
              {['Manifesto_2024.pdf', 'TikTok_Style.md'].map((file) => (
                <div
                  key={file}
                  className="flex items-center gap-2 py-2 px-3 text-xs"
                  style={{
                    background: 'var(--ip-bg-subtle)',
                    borderRadius: 'var(--ip-radius-sm)',
                    color: 'var(--ip-text-secondary)',
                  }}
                >
                  <FileText size={14} style={{ color: 'var(--ip-primary)' }} />
                  {file}
                </div>
              ))}
            </div>
          </div>

          {/* API Keys */}
          <div className="p-6" style={glassCard}>
            <div className="flex items-center gap-2 mb-5">
              <Key size={16} style={{ color: 'var(--ip-primary)' }} />
              <h2
                className="text-base font-bold"
                style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
              >
                API Keys
              </h2>
            </div>

            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div key={key.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: 'var(--ip-text)' }}>
                      {key.name}
                    </span>
                    <span
                      className="flex items-center gap-1 text-[10px] font-bold tracking-wider"
                      style={{
                        color: key.status === 'Active' ? 'var(--ip-success)' : 'var(--ip-text-tertiary)',
                      }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: key.status === 'Active' ? 'var(--ip-success)' : 'var(--ip-text-tertiary)',
                        }}
                      />
                      {key.status}
                    </span>
                  </div>
                  {key.maskedKey && (
                    <p className="text-xs font-mono" style={{ color: 'var(--ip-text-tertiary)' }}>
                      {key.maskedKey}
                    </p>
                  )}
                  {key.status === 'Unconfigured' && (
                    <button
                      className="mt-1.5 py-1.5 px-4 text-xs font-medium transition-colors"
                      style={{
                        background: 'var(--ip-text)',
                        color: 'var(--ip-text-on-primary)',
                        borderRadius: 'var(--ip-radius-full)',
                      }}
                    >
                      Configure
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Connections — full-width glassmorphic card */}
        <div className="mb-8 p-6" style={glassCard}>
          <h2
            className="text-lg font-bold mb-4"
            style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
          >
            Platform Connections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {platforms.map((p) => (
              <div
                key={p.platform}
                className="p-5 relative overflow-hidden"
                style={{
                  background: 'var(--ip-surface)',
                  borderRadius: 'var(--ip-radius-lg)',
                  boxShadow: 'var(--ip-shadow-sm)',
                  border: '1px solid var(--ip-border-subtle)',
                }}
              >
                {/* Accent stripe at top */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ background: p.color }}
                />
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="text-[10px] tracking-wider font-bold py-0.5 px-2 rounded text-white"
                    style={{ background: p.color, borderRadius: 'var(--ip-radius-sm)' }}
                  >
                    {p.platform.toUpperCase()}
                  </span>
                  {p.connected && (
                    <ExternalLink size={12} style={{ color: 'var(--ip-text-tertiary)' }} />
                  )}
                </div>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--ip-text)' }}>
                  {p.handle}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs" style={{ color: 'var(--ip-text-tertiary)' }}>
                    {p.lastSync}
                  </p>
                  {p.connected && (
                    <RefreshCw size={10} style={{ color: 'var(--ip-text-tertiary)' }} />
                  )}
                </div>
                {p.connected && (
                  <CheckCircle
                    size={14}
                    className="absolute top-4 right-4"
                    style={{ color: 'var(--ip-success)' }}
                  />
                )}
              </div>
            ))}
            {/* Connect Instagram placeholder */}
            <div
              className="p-5 flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                background: 'var(--ip-bg-subtle)',
                borderRadius: 'var(--ip-radius-lg)',
                border: '2px dashed var(--ip-border)',
              }}
            >
              <p className="text-xs font-medium" style={{ color: 'var(--ip-text-tertiary)' }}>
                + Connect Instagram
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-4 pt-4 pb-8">
          <button
            className="py-2.5 px-6 text-sm font-medium transition-colors"
            style={{
              color: 'var(--ip-text-secondary)',
              background: 'transparent',
              border: '1px solid var(--ip-border)',
              borderRadius: 'var(--ip-radius-full)',
            }}
          >
            Discard Changes
          </button>
          <button
            className="py-2.5 px-6 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            style={{
              background: 'var(--ip-primary-gradient)',
              borderRadius: 'var(--ip-radius-full)',
              boxShadow: 'var(--ip-shadow-md)',
            }}
          >
            Save Laboratory Config
          </button>
        </div>
      </div>
    </div>
  )
}
