'use client'
import { Link } from '@/shared/lib/i18n/navigation'
import Image from 'next/image'
import { ThemeSwitcher } from '@/features/theme-switcher'
import { LangSwitcher } from '@/features/lang-switcher'
import { useTranslations } from 'next-intl'
import { useState, useEffect } from 'react'
import { AuthModal } from '@/features/auth'
import { useAuthStore } from '@/entities/session'
import { useUIStore } from '@/shared/model/theme/use-ui-store'

export const Header = () => {
  const tNav = useTranslations('Navigation')
  const tWidgets = useTranslations('widgets.header')
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')
  const { isAuthenticated, setActiveView } = useAuthStore()
  const { theme } = useUIStore()

  const openAuth = (tab: 'login' | 'register') => {
    setAuthTab(tab)
    setIsAuthOpen(true)
  }

  useEffect(() => {
    const handleOpenAuth = (e: Event) => {
      const customEvent = e as CustomEvent
      openAuth(customEvent.detail || 'register')
    }
    window.addEventListener('open-auth', handleOpenAuth)
    return () => window.removeEventListener('open-auth', handleOpenAuth)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('open-register') === 'true') {
      openAuth('register')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border-subtle bg-bg-card/85 backdrop-blur-md px-6">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={theme === 'dark' ? '/ugen-logo.svg' : '/ugen-logo-dark.svg'}
            alt="Ugen Logo"
            width={120}
            height={32}
            className="h-7 w-auto"
          />
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/#databases" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            {tWidgets('databases')}
          </Link>
          <Link href="/#edge-functions" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            {tWidgets('edgeFunctions')}
          </Link>
          <Link href="/#features" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            {tWidgets('features')}
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            {tWidgets('pricing')}
          </Link>
          <Link href="/#integrations" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            {tWidgets('integrations')}
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <ThemeSwitcher />
          <LangSwitcher />
        </div>
        <div className="h-4 w-px bg-border-subtle" />
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <button
              onClick={() => setActiveView('dashboard')}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 cursor-pointer"
            >
              {tWidgets('openUgen')}
            </button>
          ) : (
            <>
              <button
                onClick={() => openAuth('login')}
                className="text-sm font-medium text-text-main hover:text-primary transition-colors cursor-pointer"
              >
                {tNav('login')}
              </button>
              <button
                onClick={() => openAuth('register')}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 cursor-pointer"
              >
                {tNav('get_started')}
              </button>
            </>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onOpenChange={setIsAuthOpen}
        defaultTab={authTab}
      />
    </header>
  )
}
