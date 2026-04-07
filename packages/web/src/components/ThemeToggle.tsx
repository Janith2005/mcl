import { Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { theme } = useTheme()

  return (
    <button
      disabled
      className="w-8 h-8 flex items-center justify-center rounded transition-colors"
      style={{
        background: 'var(--ip-bg-subtle)',
        border: '1px solid var(--ip-border)',
        color: 'var(--ip-text-secondary)',
        borderRadius: 'var(--ip-radius-md)',
        opacity: 0.7,
      }}
      title={theme === 'light' ? 'Light mode enabled' : 'Theme unavailable'}
    >
      <Sun size={14} />
    </button>
  )
}
