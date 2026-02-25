'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/shared/model/theme/use-ui-store'

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const theme = useUIStore((state) => state.theme)

  useEffect(() => {
    const root = window.document.documentElement
    
    // 1. Удаляем старые классы
    root.classList.remove('light', 'dark')
    
    // 2. Добавляем текущую тему как класс (для Tailwind v4)
    root.classList.add(theme)
    
    // 3. Устанавливаем атрибут (для твоего селектора [data-theme])
    root.setAttribute('data-theme', theme)
    
    // 4. Сохраняем в локальное хранилище (если не используешь persist в zustand)
    localStorage.setItem('theme', theme)
  }, [theme])

  return <>{children}</>
}