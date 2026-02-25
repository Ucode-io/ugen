'use client'
import { usePathname, useRouter } from '@/shared/lib/i18n/navigation'
import { useLocale } from 'next-intl'
import { startTransition } from 'react'

export const LangSwitcher = () => {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const toggleLang = (newLang: string) => {
    startTransition(() => {
      router.replace({ pathname }, { locale: newLang });
    });
  }

  return (
    <div className="flex gap-1 bg-bg-main p-1 rounded-lg border border-border-subtle">
      {['en', 'ru', 'uz'].map((lang) => (
        <button
          key={lang}
          onClick={() => toggleLang(lang)}
          className={`px-2 py-1 text-xs rounded-md transition-all ${
            locale === lang ? 'bg-primary text-white' : 'text-text-muted hover:text-text-main'
          }`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
