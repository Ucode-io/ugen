'use client'
import { Link, usePathname } from '@/shared/lib/i18n/navigation'
import Image from 'next/image'
import { ThemeSwitcher } from '@/features/theme-switcher'
import { LangSwitcher } from '@/features/lang-switcher'
import { useTranslations } from 'next-intl'
import { useState, useEffect, useRef } from 'react'
import { AuthModal } from '@/features/auth'
import { useAuthStore } from '@/entities/session'
import { useShallow } from 'zustand/react/shallow'
import { useChatStore } from '@/entities/chat'
import { ChevronDown } from 'lucide-react'

type ResourceItem = {
  icon: string
  label: string
  desc: string
  href: string
  external?: boolean
}

const RESOURCES_DROPDOWN: ResourceItem[] = [
  { icon: '🔌', label: 'Connectors', desc: '300+ integrations', href: 'https://ucode-2d4e6635.mintlify.app/integrations/integrations-list' },
  { icon: '📖', label: 'Docs', desc: 'Guides & API reference', href: 'https://ucode-2d4e6635.mintlify.app/' },
]

export const Header = () => {
  const tNav = useTranslations('Navigation')
  const pathname = usePathname()
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login')
  const [resourcesOpen, setResourcesOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { isAuthenticated, setActiveView } = useAuthStore(
    useShallow((s) => ({
      isAuthenticated: s.isAuthenticated,
      setActiveView: s.setActiveView,
    })),
  )
  const setPendingDraft = useChatStore(state => state.setPendingDraft)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const openAuth = (tab: 'login' | 'register') => {
    setAuthTab(tab)
    setIsAuthOpen(true)
  }

  const handleAuthOpenChange = (open: boolean) => {
    setIsAuthOpen(open)
    // Drop a stashed landing-page draft if the user dismisses auth without
    // signing in, so it doesn't auto-submit on a later login.
    if (!open && !useAuthStore.getState().isAuthenticated) {
      setPendingDraft(null)
    }
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
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
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
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        paddingTop: scrolled ? '12px' : '0px',
        paddingLeft: scrolled ? '5%' : '0px',
        paddingRight: scrolled ? '5%' : '0px',
        transition: 'padding 500ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
    <div
      className={`flex items-center justify-between backdrop-blur-lg ${scrolled ? 'bg-bg-card/95' : 'bg-bg-card/85'}`}
      style={{
        height: scrolled ? '3rem' : '4rem',
        borderRadius: scrolled ? '999px' : '0px',
        paddingInline: scrolled ? '0.5rem' : '1.5rem',
        boxShadow: scrolled ? '0 1px 6px 0 rgb(0 0 0 / 0.08)' : 'none',
        borderBottom: scrolled ? 'none' : '1px solid var(--color-border-subtle)',
        outline: scrolled ? '1px solid var(--color-border-subtle)' : '1px solid transparent',
        transition: 'height 500ms cubic-bezier(0.4, 0, 0.2, 1), border-radius 500ms cubic-bezier(0.4, 0, 0.2, 1), padding 500ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 500ms cubic-bezier(0.4, 0, 0.2, 1), outline-color 500ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div className="flex items-center gap-7">
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image
            src="/ugen-logo.svg"
            alt="Ugen Logo"
            width={120}
            height={32}
            className="h-7 w-auto"
          />
        </Link>
        <nav className="hidden md:flex items-center gap-0.5">
          <Link
            href="/"
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${pathname === '/' ? 'text-text-main bg-hover-bg' : 'text-text-muted hover:text-text-main hover:bg-hover-bg'}`}
          >
            Home
          </Link>
          <Link
            href="/pricing"
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${pathname === '/pricing' ? 'text-text-main bg-hover-bg' : 'text-text-muted hover:text-text-main hover:bg-hover-bg'}`}
          >
            Pricing
          </Link>
          <a
            href="https://t.me/ucode_support"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-text-muted hover:text-text-main hover:bg-hover-bg px-3 py-1.5 rounded-lg transition-colors"
          >
            Community
          </a>
          <Link
            href="/templates"
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${pathname === '/templates' ? 'text-text-main bg-hover-bg' : 'text-text-muted hover:text-text-main hover:bg-hover-bg'}`}
          >
            Templates
          </Link>
          <Link
            href="/hire-expert"
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${pathname === '/hire-expert' ? 'text-text-main bg-hover-bg' : 'text-text-muted hover:text-text-main hover:bg-hover-bg'}`}
          >
            Hire an Expert
          </Link>

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
              <div className="absolute top-[calc(100%+6px)] left-0 bg-bg-card border border-border-subtle rounded-[10px] shadow-xl p-1.5 min-w-[210px] z-50">
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
                      <div className="flex-1 flex flex-col">
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
                      <div className="flex-1 flex flex-col ">
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
        {/* <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <LangSwitcher />
        </div> */}
        {/* <div className="h-4 w-px bg-border-subtle" /> */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button
              onClick={() => setActiveView('dashboard')}
              className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 cursor-pointer"
            >
              Open u&#8209;gen
            </button>
          ) : (
            <>
              <button
                onClick={() => openAuth('login')}
                className="text-sm font-medium text-text-muted hover:text-text-main transition-colors cursor-pointer border border-border-subtle px-4 py-1.5 rounded-full hover:border-border-subtle/60 bg-transparent"
              >
                {tNav('login')}
              </button>
              <button
                onClick={() => openAuth('register')}
                className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 cursor-pointer"
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
        onOpenChange={handleAuthOpenChange}
        defaultTab={authTab}
      />
    </header>
  )
}
