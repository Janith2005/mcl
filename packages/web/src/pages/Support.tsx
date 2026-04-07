import { MessageSquare, BookOpen, Bug, Mail, ExternalLink } from 'lucide-react'

const glassCard: React.CSSProperties = {
  background: 'var(--ip-surface-glass)',
  backdropFilter: 'blur(var(--ip-glass-blur))',
  borderRadius: 'var(--ip-radius-lg)',
  boxShadow: 'var(--ip-shadow-md)',
  border: '1px solid var(--ip-border-subtle)',
}

const supportItems = [
  {
    icon: MessageSquare,
    title: 'Talk to Tactical Assistant',
    description: 'Use the AI chat panel on the right to ask strategy questions, get content ideas, or debug your pipeline.',
    action: 'Open Chat',
    color: 'var(--ip-primary)',
  },
  {
    icon: BookOpen,
    title: 'Documentation',
    description: 'Learn how the 7-stage pipeline works, how to configure your brain, and how to read your analytics.',
    action: 'Read Docs',
    href: 'https://docs.microcelebritylabs.com',
    color: 'var(--ip-stage-discover)',
  },
  {
    icon: Bug,
    title: 'Report a Bug',
    description: 'Found something broken? Let us know and we\'ll fix it fast. Include your browser and what you were doing.',
    action: 'Report',
    href: 'mailto:bugs@microcelebritylabs.com',
    color: 'var(--ip-error)',
  },
  {
    icon: Mail,
    title: 'Email Support',
    description: 'For billing questions, account issues, or anything else, reach out directly to our team.',
    action: 'Email Us',
    href: 'mailto:support@microcelebritylabs.com',
    color: 'var(--ip-stage-script)',
  },
]

const faqs = [
  {
    q: 'How does the pipeline work?',
    a: 'The 7-stage pipeline goes: Discover -> Angle -> Hook -> Script -> Publish -> Analyze -> Brain Evolves. Each stage builds on the last. Start by discovering topics that resonate with your ICP.',
  },
  {
    q: 'What is the Agent Brain?',
    a: 'The Brain is a knowledge store unique to your workspace. It learns your ICP, brand voice, content pillars, and what has historically worked. Every content cycle makes it smarter.',
  },
  {
    q: 'How do I connect my YouTube channel?',
    a: 'Go to Settings -> Connections and click "Connect YouTube". This triggers an OAuth flow that lets us pull your analytics and sync performance data back to your Brain.',
  },
  {
    q: 'Why is my API key showing as Unconfigured?',
    a: 'Go to Settings -> API Keys and click "Configure" next to the key name. Paste your key in the input and click Save. Keys are stored encrypted and only the last 4 characters are shown.',
  },
  {
    q: 'What hook patterns does the system use?',
    a: 'Six patterns: The Question, The Stat, The Negative Stake, The Contrarian, The Visual Bridge, and The Direct Payoff. Each is scored based on your historical performance data.',
  },
]

export function Support() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold mb-2"
          style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
        >
          Support & Help
        </h1>
        <p className="text-sm" style={{ color: 'var(--ip-text-secondary)' }}>
          Get help with your Influencer Pirates workspace.
        </p>
      </div>

      {/* Support Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {supportItems.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="p-5" style={glassCard}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)` }}
                >
                  <Icon size={18} style={{ color: item.color }} />
                </div>
                <h3 className="text-sm font-bold" style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}>
                  {item.title}
                </h3>
              </div>
              <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--ip-text-secondary)' }}>
                {item.description}
              </p>
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
                >
                  {item.action}
                  <ExternalLink size={12} />
                </a>
              ) : (
                <button
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                  style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
                >
                  {item.action}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* FAQ */}
      <div>
        <h2
          className="text-xl font-bold mb-5"
          style={{ fontFamily: 'var(--ip-font-display)', color: 'var(--ip-text)' }}
        >
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="p-5" style={glassCard}>
              <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--ip-text)', fontFamily: 'var(--ip-font-display)' }}>
                {faq.q}
              </h4>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--ip-text-secondary)' }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 p-5 text-center" style={{ ...glassCard, borderTop: `3px solid var(--ip-primary)` }}>
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ip-text)' }}>
          Still stuck?
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--ip-text-secondary)' }}>
          Email us at <strong>support@microcelebritylabs.com</strong> - we usually reply within a few hours.
        </p>
        <a
          href="mailto:support@microcelebritylabs.com"
          className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ background: 'var(--ip-primary-gradient)', borderRadius: 'var(--ip-radius-full)' }}
        >
          <Mail size={12} />
          Contact Support
        </a>
      </div>
    </div>
  )
}
