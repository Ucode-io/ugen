'use client'
import { usePathname, useRouter } from '@/shared/lib/i18n/navigation'
import { useLocale } from 'next-intl'
import { startTransition } from 'react'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/ui/select'

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
    <Select value={locale} onValueChange={toggleLang}>
      <SelectTrigger className="w-[80px] h-8 bg-transparent border-border-subtle hover:bg-bg-sidebar transition-colors rounded-md text-xs font-medium">
        <SelectValue placeholder="Lang" />
      </SelectTrigger>
      <SelectContent>
        {['en', 'ru', 'uz'].map((lang) => (
          <SelectItem key={lang} value={lang} className="text-xs font-medium cursor-pointer">
            {lang.toUpperCase()}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
