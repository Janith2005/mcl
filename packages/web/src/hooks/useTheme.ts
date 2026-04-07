import { useState, useEffect } from 'react'

type Theme = 'light'

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark')
    localStorage.setItem('ip-theme', 'light')
  }, [])

  const toggle = () => undefined

  return { theme, setTheme, toggle }
}
