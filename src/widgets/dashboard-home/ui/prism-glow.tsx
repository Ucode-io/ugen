'use client'
import { cn } from '@/shared/lib/utils/cn'
import { useUIStore } from '@/shared/model/theme/use-ui-store'

// Dashboard brand glow: основной синий, cyan/sky-токены и фиолетовый
// upgrade-акцент растворяются в мягкое ambient-свечение по периметру.
// Никаких чётких фигур — каждое пятно это radial-gradient + сильный blur.
const BLOBS = [
  { pos: '-top-[20%] -left-[15%]', size: 'h-[560px] w-[560px]', color: 'var(--color-glow-primary, #3B82F6)', anim: 'animate-glow-drift-a', delay: '0s' }, // primary blue — верх-лево
  { pos: '-top-[18%] -right-[12%]', size: 'h-[520px] w-[520px]', color: 'var(--color-glow-tertiary, #06B6D4)', anim: 'animate-glow-drift-b', delay: '-4s' }, // cyan — верх-право
  { pos: '-bottom-[22%] -left-[12%]', size: 'h-[520px] w-[520px]', color: 'var(--color-glow-secondary, #44A5DF)', anim: 'animate-glow-drift-d', delay: '-7s' }, // sky — низ-лево
  { pos: '-bottom-[18%] -right-[15%]', size: 'h-[560px] w-[560px]', color: '#8b5cf6', anim: 'animate-glow-drift-b', delay: '-11s' }, // upgrade violet — низ-право
  { pos: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', size: 'h-[640px] w-[640px]', color: '#dbeafe', anim: 'animate-glow-drift-c', delay: '0s', center: true }, // soft blue — мягкий центр
]

/**
 * Ambient prism glow в палитре dashboard. Brand-пятна по углам,
 * сильно размытые до полного растворения формы. Тема-зависимый: на тёмном
 * холсте светятся через screen-blend, на светлом — мягкая пастель.
 */
export const PrismGlow = () => {
  const { theme } = useUIStore()
  const isDark = theme === 'dark'

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className={cn(
            'absolute rounded-full blur-[140px] will-change-transform',
            b.size,
            b.pos,
            b.anim,
            isDark && 'mix-blend-screen',
          )}
          style={{
            background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
            opacity: isDark ? (b.center ? 0.24 : 0.48) : b.center ? 0.12 : 0.2,
            animationDelay: b.delay,
          }}
        />
      ))}
    </div>
  )
}
