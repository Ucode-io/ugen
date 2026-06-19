'use client'

import { cn } from "@/shared/lib/utils/cn"
import { useUIStore } from '@/shared/model/theme/use-ui-store'

interface AuroraBackgroundProps {
  showRadialGradient?: boolean
}

const AURORA = `repeating-linear-gradient(100deg, var(--color-glow-primary) 10%, var(--color-glow-secondary) 15%, var(--color-glow-tertiary) 20%, var(--color-glow-secondary) 25%, var(--color-glow-primary) 30%)`
const WHITE_STRIPES = `repeating-linear-gradient(100deg, #ffffff 0%, #ffffff 7%, transparent 10%, transparent 12%, #ffffff 16%)`
const DARK_STRIPES = `repeating-linear-gradient(100deg, #000000 0%, #000000 7%, transparent 10%, transparent 12%, #000000 16%)`

export const AuroraBackground = ({ showRadialGradient = true }: AuroraBackgroundProps) => {
  const { theme } = useUIStore()
  const isDark = theme === 'dark'

  const stripes = isDark ? DARK_STRIPES : WHITE_STRIPES

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <div
        style={{
          backgroundImage: `${stripes}, ${AURORA}`,
          backgroundSize: '300%, 200%',
          backgroundPosition: '50% 50%, 50% 50%',
        }}
        className={cn(
          'pointer-events-none absolute -inset-2.5 opacity-50 will-change-transform',
          'blur-[10px]',
          !isDark && 'invert',
          showRadialGradient && 'mask-[radial-gradient(ellipse_at_100%_0%,black_10%,transparent_70%)]',
          'after:absolute after:inset-0 after:animate-aurora after:bg-fixed after:mix-blend-difference after:content-[""]'
        )}
      >
        <div
          style={{
            backgroundImage: `${stripes}, ${AURORA}`,
            backgroundSize: '200%, 100%',
          }}
          className="absolute inset-0 animate-aurora bg-fixed mix-blend-difference"
        />
      </div>
    </div>
  )
}
