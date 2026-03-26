import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 flex items-center justify-center rounded transition-colors"
      style={{
        background: 'var(--ip-bg-subtle)',
        border: '1px solid var(--ip-border)',
        color: 'var(--ip-text-secondary)',
        borderRadius: 'var(--ip-radius-md)',
      }}
      title={theme === 'light' ? 'Switch to Obsidian Plunder' : 'Switch to Holo Prism'}
    >
      {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
    </button>
  )
}
