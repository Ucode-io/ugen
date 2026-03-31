'use client'

import { useUIStore } from '@/shared/model/theme/use-ui-store'
import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Sun, Moon } from 'lucide-react'
export const ThemeSwitcher = () => {
  const t = useTranslations('features.themeSwitcher')
  const { theme, setTheme } = useUIStore()

  useEffect(() => {
    const root = window.document.documentElement
    root.setAttribute('data-theme', theme)
    if (theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [theme])

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="flex items-center justify-center p-2 rounded-ai bg-bg-card border border-border-subtle hover:border-primary transition-all text-primary"
      aria-label={t('ariaLabel')}
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  )
}
