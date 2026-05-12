'use client'
import { Link } from '@/shared/lib/i18n/navigation'
import Image from 'next/image'
import { ThemeSwitcher } from '@/features/theme-switcher'
import { LangSwitcher } from '@/features/lang-switcher'
import { useTranslations } from 'next-intl'
import { useState, useEffect, useRef } from 'react'
import { AuthModal } from '@/features/auth'
import { useAuthStore } from '@/entities/session'
import { useUIStore } from '@/shared/model/theme/use-ui-store'
import { ChevronDown } from 'lucide-react'

const RESOURCES_DROPDOWN = [
  { icon: '📦', label: 'Templates', desc: 'Ready-made apps', href: '/templates' },
  { icon: '🔌', label: 'Connectors', desc: '300+ integrations', href: '/connectors' },
  { icon: '👤', label: 'Hire an Expert', desc: 'Get help building', href: '/hire-expert' },
  { icon: '📖', label: 'Docs', desc: 'Guides & API reference', href: '/docs' },
  { icon: '✈', label: 'Community', desc: 'Join on Telegram', href: 'https://t.me/ucode_community', external: true },
]

export const Header = () => {
  const tNav = useTranslations('Navigation')
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const { isAuthenticated, setActiveView } = useAuthStore()
  const { theme } = useUIStore()
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setResourcesOpen(false)
      }
    }
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setResourcesOpen(false) }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-bg-card/85 backdrop-blur-md">
      <div className="max-w-[1100px] mx-auto px-6 flex h-16 items-center justify-between">
      <div className="flex items-center gap-7">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image
            src={theme === 'dark' ? '/ugen-logo.svg' : '/ugen-logo-dark.svg'}
            alt="Ugen Logo"
            width={120}
            height={32}
            className="h-7 w-auto"
          />
        </Link>
        <nav className="hidden md:flex items-center gap-0.5">
          <Link
            href="/pricing"
            className="text-sm font-medium text-text-muted hover:text-text-main hover:bg-hover-bg px-3 py-1.5 rounded-lg transition-colors"
          >
            Pricing
          </Link>
          <a
            href="https://t.me/ucode_community"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-text-muted hover:text-text-main hover:bg-hover-bg px-3 py-1.5 rounded-lg transition-colors"
          >
            Community
          </a>

          {/* Resources dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text-main hover:bg-hover-bg px-3 py-1.5 rounded-lg transition-colors cursor-pointer border-none bg-transparent"
            >
              Resources
              <ChevronDown
                size={13}
                className={`transition-transform duration-200 ${resourcesOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {resourcesOpen && (
              <div className="absolute top-[calc(100%+6px)] left-0 bg-bg-card border border-border-subtle rounded-[10px] shadow-xl p-1.5 min-w-[200px] z-50">
                {RESOURCES_DROPDOWN.map((item) =>
                  item.external ? (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setResourcesOpen(false)}
                      className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-hover-bg transition-colors no-underline"
                    >
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-[0.9rem] flex-shrink-0 bg-hover-bg">
                        {item.icon}
                      </div>
                      <div>
                        <strong className="block text-[0.82rem] font-semibold text-text-main">{item.label}</strong>
                        <span className="text-[0.74rem] text-text-muted">{item.desc}</span>
                      </div>
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      href={item.href as any}
                      onClick={() => setResourcesOpen(false)}
                      className="flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-hover-bg transition-colors no-underline"
                    >
                      <div className="w-7 h-7 rounded-md flex items-center justify-center text-[0.9rem] flex-shrink-0 bg-hover-bg">
                        {item.icon}
                      </div>
                      <div>
                        <strong className="block text-[0.82rem] font-semibold text-text-main">{item.label}</strong>
                        <span className="text-[0.74rem] text-text-muted">{item.desc}</span>
                      </div>
                    </Link>
                  )
                )}
              </div>
            )}
          </div>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <LangSwitcher />
        </div>
        <div className="h-4 w-px bg-border-subtle" />
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={() => setActiveView('dashboard')}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 cursor-pointer"
            >
              Open u&#8209;gen
            </button>
          ) : (
            <>
              <button
                onClick={() => openAuth('login')}
                className="text-sm font-medium text-text-muted hover:text-text-main transition-colors cursor-pointer border border-border-subtle px-4 py-1.5 rounded-lg hover:border-border-subtle/60 bg-transparent"
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
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onOpenChange={setIsAuthOpen}
        defaultTab={authTab}
      />
    </header>
  )
}
