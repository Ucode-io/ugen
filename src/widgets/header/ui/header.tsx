'use client'
import { Link } from '@/shared/lib/i18n/navigation'
import Image from 'next/image'
import { ThemeSwitcher } from '@/features/theme-switcher'
import { LangSwitcher } from '@/features/lang-switcher'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { AuthModal } from '@/features/auth'
import { useAuthStore } from '@/entities/session'
import { useUIStore } from '@/shared/model/theme/use-ui-store'

export const Header = () => {
  const t = useTranslations('Navigation')
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')
  const { isAuthenticated, setActiveView } = useAuthStore()
  const { theme } = useUIStore()

  const openAuth = (tab: 'login' | 'register') => {
    setAuthTab(tab)
    setIsAuthOpen(true)
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-border-subtle bg-bg-main px-6">
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
        <nav className="flex items-center gap-6">
          <Link href="/features" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            {t('features')}
          </Link>
          <Link href="/pricing" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            {t('pricing')}
          </Link>
          <Link href="/about" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
            {t('about')}
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
              Open ugen
            </button>
          ) : (
            <>
              <button
                onClick={() => openAuth('login')}
                className="text-sm font-medium text-text-main hover:text-primary transition-colors cursor-pointer"
              >
                {t('login')}
              </button>
              <button
                onClick={() => openAuth('register')}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 cursor-pointer"
              >
                {t('get_started')}
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
