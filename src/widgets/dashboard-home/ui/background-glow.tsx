'use client'
import { useUIStore } from '@/shared/model/theme/use-ui-store'

const DarkGlow = () => (
  <>
    <div className="absolute -bottom-[10%] -left-[30%] w-[300px] h-[300px] bg-[var(--color-glow-primary)] rounded-full mix-blend-screen blur-[120px] opacity-50"></div>
    <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] bg-[var(--color-glow-primary)] rounded-full mix-blend-screen blur-[140px] opacity-40"></div>
    <div className="absolute -top-[10%] right-[10%] w-[400px] h-[400px] bg-[var(--color-glow-secondary)] rounded-full mix-blend-screen blur-[100px] opacity-40"></div>
    <div className="absolute bottom-[10%] -right-[5%] w-[450px] h-[450px] bg-[var(--color-glow-tertiary)] rounded-full mix-blend-screen blur-[120px] opacity-40"></div>
  </>
);

const LightGlow = () => (
  <>
    <div className="absolute -top-[10%] left-[0] w-[300px] h-[300px] bg-[var(--color-glow-tertiary)] rounded-full blur-[140px] opacity-50"></div>
    <div className="absolute -bottom-[10%] left-[0] w-[500px] h-[500px] bg-[var(--color-glow-primary)] rounded-full blur-[140px] opacity-30"></div>
    <div className="absolute -top-[10%] right-[0] w-[400px] h-[400px] bg-[var(--color-glow-secondary)] rounded-full blur-[100px] opacity-30"></div>
    <div className="absolute bottom-[10%] right-[0] w-[450px] h-[450px] bg-[var(--color-glow-tertiary)] rounded-full blur-[120px] opacity-40"></div>
  </>
);

export const BackgroundGlow = () => {
  const { theme } = useUIStore()

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {theme === 'dark' ? <DarkGlow /> : <LightGlow />}
    </div>
  )
}
