'use client'
import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link, usePathname } from '@/shared/lib/i18n/navigation'
import { LayoutDashboard, Database, Cpu, Settings, User, ChevronDown } from 'lucide-react'
import { ThemeSwitcher } from '@/features/theme-switcher'
import { LangSwitcher } from '@/features/lang-switcher'
import Image from 'next/image'

const menuItems = [
  { key: 'dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'generator', href: '/dashboard/generator', icon: Cpu },
  { key: 'tables', href: '/dashboard/tables', icon: Database },
]

export const Sidebar = () => {
  const t = useTranslations('Navigation')
  const pathname = usePathname()

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <aside className="flex flex-col w-64 h-screen bg-bg-sidebar border-r border-border-subtle transition-colors duration-300">

      <div className="p-4 space-y-5">
        <Link
          href="/"
          className="flex items-center gap-2 px-1"
        >
          <Image
            src="/logo.svg"
            alt="Ugen Logo"
            width={120}
            height={32}
            className="h-7 w-auto"
          />
        </Link>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex w-full items-center justify-between px-3 py-2 border border-border-subtle rounded-ai bg-bg-card hover:border-primary transition-all duration-200"
          >
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User size={16} />
              </div>
              <span className="text-sm font-medium text-text-main">Profile</span>
            </div>
            <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileOpen && (
            <div className="absolute top-[calc(100%+8px)] left-0 w-full p-3 bg-bg-card border border-border-subtle rounded-ai shadow-lg z-50 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Theme</span>
                <ThemeSwitcher />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs text-text-muted font-medium uppercase tracking-wider">Language</span>
                <LangSwitcher />
              </div>

              <div className="h-px w-full bg-border-subtle" />

              <Link
                href="/dashboard/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-main hover:text-primary hover:bg-bg-sidebar rounded-lg transition-colors border border-transparent hover:border-border-subtle"
              >
                <Settings size={16} className="text-text-muted hover:text-primary transition-colors" />
                <span className="font-medium">{t('settings')}</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`
                flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 border text-sm
                ${isActive
                  ? 'bg-primary text-white border-primary shadow-sm shadow-primary/20'
                  : 'text-text-muted hover:bg-bg-card hover:text-primary border-transparent hover:border-border-subtle'}
              `}
            >
              <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              <span className="font-medium">{t(item.key)}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer остаётся таким же, используя переменные из global.css */}
    </aside>
  )
}
