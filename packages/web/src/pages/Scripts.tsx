import { useState } from 'react'
import {
  Bold,
  Italic,
  Link,
  List,
  Captions,
  Sparkles,
  AudioWaveform,
  Search,
  FileText,
  History,
  Share2,
  Settings,
  Diamond,
  BarChart3,
} from 'lucide-react'

interface BeatSection {
  id: string
  label: string
  title: string
  description: string
  wordCount: number
  totalWords: number
  accentColor: string
}

const beatSections: BeatSection[] = [
  {
    id: 'hook',
    label: 'HOOK / INTRO',
    title: 'The Disruptive Stat',
    description: 'Start with the 98% failure rate in the first 3 seconds of viewing.',
    wordCount: 42,
    totalWords: 50,
    accentColor: 'var(--ip-hook-question)',
  },
  {
    id: 'vp1',
    label: 'VALUE PILLAR 01',
    title: 'The Mirror Technique',
    description: "Explain how mirroring the audience's physical state creates instant trust.",
    wordCount: 128,
    totalWords: 150,
    accentColor: 'var(--ip-hook-stat)',
  },
  {
    id: 'vp2',
    label: 'VALUE PILLAR 02',
    title: 'Cognitive Friction',
    description: 'Demonstrate why making them think slightly harder makes the memory stick.',
    wordCount: 95,
    totalWords: 130,
    accentColor: 'var(--ip-hook-contrarian)',
  },
  {
    id: 'cta',
    label: 'FINAL STRIKE / CTA',
    title: 'The VIP Invitation',
    description: 'Exclusive link to the Luminous Lab waitlist.',
    wordCount: 32,
    totalWords: 40,
    accentColor: 'var(--ip-hook-visual-bridge)',
  },
]

const scriptCapabilities = [
  { label: 'Strategy', color: 'var(--ip-hook-question)', active: true },
  { label: 'Knowledge', color: 'var(--ip-hook-stat)', active: false },
  { label: 'Health', color: 'var(--ip-hook-visual-bridge)', active: false },
  { label: 'Growth', color: 'var(--ip-hook-direct-payoff)', active: false },
]

const scriptContent: Record<string, { heading: string; body: string }> = {
  hook: {
    heading: 'THE OPENING SALVO',
    body: `Did you know that 98% of people scroll past your content before you even speak?

It's a brutal reality. In the Luminous Lab, we call this the "3-Second Death Zone." If your visual hook isn't shattering their dopamine loop immediately, you've already lost the war for attention.`,
  },
  vp1: {
    heading: 'THE MIRROR TECHNIQUE',
    body: `Most creators try to be "high energy" by screaming at the camera. But true influence is a mirror.

If your audience is laying in bed scrolling at 11 PM, and you're at 100% volume, you're not an expert -- you're a nuisance.

Match their energy. Mirror their posture. Whisper the quiet part loud.`,
  },
  vp2: {
    heading: 'COGNITIVE FRICTION',
    body: `Here's something counterintuitive: making your content slightly harder to process actually increases retention.

When you introduce a small cognitive gap, the brain works harder to close it. That effort creates stronger memory encoding. Use strategic pauses, unexpected analogies, and pattern interrupts.`,
  },
  cta: {
    heading: 'THE VIP INVITATION',
    body: `If you've made it this far, you're not a casual scroller. You're a builder.

Join the Luminous Lab waitlist. We're building the operating system for the next generation of micro-influencers. Link in bio. First 500 get lifetime access.`,
  },
}

const toolbarButtons = [
  { icon: Bold, label: 'Bold' },
  { icon: Italic, label: 'Italic' },
  { icon: Link, label: 'Link' },
  { icon: List, label: 'List' },
  { icon: Captions, label: 'Caption' },
]

export function Scripts() {
  const [activeSection, setActiveSection] = useState('hook')

  const content = scriptContent[activeSection]

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] -m-8">
      {/* Top Breadcrumb Bar */}
      <div
        className="flex items-center gap-4 px-6 py-3 flex-shrink-0"
        style={{
          background: 'var(--ip-surface)',
          borderBottom: '1px solid var(--ip-border-subtle)',
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--ip-text-secondary)' }}
          >
            Influence Pirates
          </span>
          <span style={{ color: 'var(--ip-text-tertiary)' }}>/</span>
          <span
            className="text-sm font-bold"
            style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}
          >
            The Hook Master
          </span>
        </div>

        <div className="flex-1" />

        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 text-sm"
          style={{
            background: 'var(--ip-bg-subtle)',
            borderRadius: 'var(--ip-radius-full)',
            border: '1px solid var(--ip-border-subtle)',
            color: 'var(--ip-text-tertiary)',
          }}
        >
          <Search size={14} />
          <span className="text-xs">Search project scripts...</span>
        </div>

        {/* Action Buttons */}
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
          style={{
            background: 'var(--ip-bg-subtle)',
            borderRadius: 'var(--ip-radius-full)',
            border: '1px solid var(--ip-border)',
            color: 'var(--ip-text)',
          }}
        >
          <FileText size={13} />
          PDF Export
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
          style={{
            background: 'var(--ip-bg-subtle)',
            borderRadius: 'var(--ip-radius-full)',
            border: '1px solid var(--ip-border)',
            color: 'var(--ip-text)',
          }}
        >
          <History size={13} />
          Version History
        </button>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
          style={{
            background: 'var(--ip-bg-subtle)',
            borderRadius: 'var(--ip-radius-full)',
            border: '1px solid var(--ip-border)',
            color: 'var(--ip-text)',
          }}
        >
          <Share2 size={13} />
          Share
        </button>

        {/* User Avatar + Settings */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'var(--ip-bg-subtle)', color: 'var(--ip-text-tertiary)' }}
        >
          <Settings size={16} />
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
          style={{ background: 'var(--ip-primary-gradient)' }}
        >
          CV
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex gap-0 flex-1 min-h-0">
        {/* Left Panel: Beat Sheet */}
        <div
          className="w-72 flex-shrink-0 overflow-y-auto p-5"
          style={{
            background: 'linear-gradient(180deg, #A666AA 0%, #E879A8 60%, #F5A0C0 100%)',
            borderRight: '1px solid var(--ip-border-subtle)',
          }}
        >
          <div className="flex items-center justify-between mb-5">
            <h2
              className="text-sm font-bold uppercase tracking-wider"
              style={{ color: 'rgba(255,255,255,0.95)', fontFamily: 'var(--ip-font-display)' }}
            >
              Beat Sheet
            </h2>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.25)', color: '#FFFFFF' }}
            >
              {beatSections.length}
            </div>
          </div>

          <div className="space-y-3">
            {beatSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className="w-full text-left p-4 transition-all"
                style={{
                  background:
                    activeSection === section.id
                      ? 'rgba(0,0,0,0.3)'
                      : 'rgba(0,0,0,0.18)',
                  borderRadius: 'var(--ip-radius-md)',
                  borderLeft: `3px solid ${section.accentColor}`,
                  backdropFilter: 'blur(8px)',
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: section.accentColor }}
                  >
                    {section.label}
                  </span>
                  <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {section.wordCount}/{section.totalWords}
                  </span>
                </div>
                <h3
                  className="text-sm font-semibold mb-1"
                  style={{
                    color: '#FFFFFF',
                    fontFamily: 'var(--ip-font-display)',
                  }}
                >
                  {section.title}
                </h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  {section.description}
                </p>
              </button>
            ))}
          </div>

          {/* Bottom avatar */}
          <div className="mt-8 flex items-center gap-3 px-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'rgba(255,255,255,0.25)' }}
            >
              CV
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: '#FFFFFF' }}>Captain Vane</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.6)' }}>Pro Plan</p>
            </div>
          </div>
        </div>

        {/* Center: Script Editor */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Toolbar */}
          <div
            className="flex items-center gap-1 px-6 py-3"
            style={{
              background: 'var(--ip-surface)',
              borderBottom: '1px solid var(--ip-border-subtle)',
            }}
          >
            {toolbarButtons.map(({ icon: Icon, label }) => (
              <button
                key={label}
                title={label}
                className="w-9 h-9 flex items-center justify-center rounded transition-colors hover:bg-[var(--ip-bg-subtle)]"
                style={{ color: 'var(--ip-text-secondary)' }}
              >
                <Icon size={18} />
              </button>
            ))}
            <div className="flex-1" />
            {/* Script Capabilities */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: 'var(--ip-text-tertiary)' }}>
                Script Capabilities
              </span>
              {scriptCapabilities.map((cap) => (
                <span
                  key={cap.label}
                  className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium"
                  style={{
                    background: cap.active ? cap.color : 'transparent',
                    color: cap.active ? 'white' : 'var(--ip-text-tertiary)',
                    border: cap.active ? 'none' : '1px solid var(--ip-border)',
                    borderRadius: 'var(--ip-radius-full)',
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: cap.active ? 'white' : cap.color,
                    }}
                  />
                  {cap.label}
                </span>
              ))}
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-y-auto px-12 py-8" style={{ background: 'var(--ip-bg)' }}>
            <div
              className="max-w-2xl mx-auto p-8"
              style={{
                background: 'var(--ip-card-glass-bg)',
                backdropFilter: `blur(var(--ip-card-glass-blur))`,
                borderRadius: 'var(--ip-radius-lg)',
                boxShadow: 'var(--ip-card-glass-shadow)',
                border: '1px solid var(--ip-card-glass-border)',
              }}
            >
              {/* Section Label */}
              <div className="flex items-center gap-2 mb-6">
                <span style={{ color: 'var(--ip-primary)' }}>
                  <Diamond size={14} />
                </span>
                <span
                  className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: 'var(--ip-primary)' }}
                >
                  {content.heading}
                </span>
              </div>

              {/* Script Text */}
              <div className="space-y-6">
                {content.body.split('\n\n').map((paragraph, idx) => (
                  <p
                    key={idx}
                    className={idx === 0 ? 'text-3xl font-bold leading-tight' : 'text-base leading-relaxed'}
                    style={{
                      fontFamily: idx === 0 ? 'var(--ip-font-display)' : 'var(--ip-font-body)',
                      color: 'var(--ip-text)',
                    }}
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            {/* Live Feedback sidebar panel inside editor area */}
            <div className="max-w-2xl mx-auto mt-6 flex justify-end">
              <div
                className="p-4 w-48"
                style={{
                  background: 'var(--ip-card-glass-bg)',
                  backdropFilter: `blur(var(--ip-card-glass-blur))`,
                  borderRadius: 'var(--ip-radius-lg)',
                  boxShadow: 'var(--ip-card-glass-shadow)',
                  border: '1px solid var(--ip-card-glass-border)',
                }}
              >
                <p
                  className="text-[10px] font-bold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--ip-text-tertiary)' }}
                >
                  Live Feedback
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className="text-lg font-bold"
                    style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
                  >
                    High Impact
                  </span>
                  <BarChart3 size={20} style={{ color: 'var(--ip-primary)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Floating Action Buttons */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 z-10">
            <button
              className="flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-opacity"
              style={{
                background: 'var(--ip-primary-gradient)',
                borderRadius: 'var(--ip-radius-full)',
                boxShadow: 'var(--ip-shadow-glow)',
              }}
            >
              <Sparkles size={16} />
              AI Rewrite
            </button>
            <button
              className="flex items-center gap-2 px-5 py-3 text-sm font-medium shadow-md transition-colors hover:bg-[var(--ip-surface-hover)]"
              style={{
                background: 'var(--ip-card-glass-bg)',
                backdropFilter: `blur(var(--ip-card-glass-blur))`,
                borderRadius: 'var(--ip-radius-full)',
                border: '1px solid var(--ip-card-glass-border)',
                color: 'var(--ip-text)',
              }}
            >
              <AudioWaveform size={16} />
              Tone Check
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
