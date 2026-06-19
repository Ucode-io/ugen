'use client'
import { useUIStore } from '@/shared/model/theme/use-ui-store'

const DarkGlow = () => (
  <div className="absolute inset-0 pointer-events-none z-0">
    <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] bg-[var(--color-glow-primary)] rounded-full mix-blend-screen blur-[140px] opacity-40 animate-glow-drift-a will-change-transform" />
    <div className="absolute -top-[10%] right-[10%] w-[400px] h-[400px] bg-[var(--color-glow-secondary)] rounded-full mix-blend-screen blur-[100px] opacity-40 animate-glow-drift-b [animation-delay:-4s] will-change-transform" />

    {/* Центральный блоб — страхует длинный контент */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[var(--color-glow-primary)] rounded-full mix-blend-screen blur-[160px] opacity-20 animate-glow-drift-c will-change-transform" />

    <div className="absolute -bottom-[10%] -left-[30%] w-[300px] h-[300px] bg-[var(--color-glow-primary)] rounded-full mix-blend-screen blur-[120px] opacity-50 animate-glow-drift-d [animation-delay:-7s] will-change-transform" />
    <div className="absolute bottom-[10%] -right-[5%] w-[450px] h-[450px] bg-[var(--color-glow-tertiary)] rounded-full mix-blend-screen blur-[120px] opacity-40 animate-glow-drift-b [animation-delay:-11s] will-change-transform" />
  </div>
)

const LightGlow = () => (
  <div className="absolute inset-0 pointer-events-none z-0">
    <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] bg-[var(--color-glow-tertiary)] rounded-full blur-[140px] opacity-30 animate-glow-drift-a will-change-transform" />
    <div className="absolute -top-[10%] right-[10%] w-[400px] h-[400px] bg-[var(--color-glow-secondary)] rounded-full blur-[100px] opacity-25 animate-glow-drift-b [animation-delay:-4s] will-change-transform" />

    {/* Центральный блоб */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[var(--color-glow-primary)] rounded-full blur-[160px] opacity-15 animate-glow-drift-c will-change-transform" />

    <div className="absolute -bottom-[10%] -left-[30%] w-[300px] h-[300px] bg-[var(--color-glow-primary)] rounded-full blur-[120px] opacity-30 animate-glow-drift-d [animation-delay:-7s] will-change-transform" />
    <div className="absolute bottom-[10%] -right-[5%] w-[450px] h-[450px] bg-[var(--color-glow-tertiary)] rounded-full blur-[120px] opacity-25 animate-glow-drift-b [animation-delay:-11s] will-change-transform" />
  </div>
)

export const BackgroundGlow = () => {
  const { theme } = useUIStore()

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {theme === 'dark' ? <DarkGlow /> : <LightGlow />}
    </div>
  )
}
