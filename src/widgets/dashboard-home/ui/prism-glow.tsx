'use client'
import { cn } from '@/shared/lib/utils/cn'
import { useUIStore } from '@/shared/model/theme/use-ui-store'

// Спектр Dia, разнесённый по углам: тёплый край (роза / янтарь / красный)
// и холодный (синий) растворяются в мягкое ambient-свечение по периметру,
// плюс лёгкая лавандовая подсветка в центре. Никаких чётких фигур —
// каждое пятно это radial-gradient + сильный blur.
const BLOBS = [
  { pos: '-top-[20%] -left-[15%]', size: 'h-[560px] w-[560px]', color: '#c679c4', anim: 'animate-glow-drift-a', delay: '0s' }, // роза — верх-лево
  { pos: '-top-[18%] -right-[12%]', size: 'h-[520px] w-[520px]', color: '#0358f7', anim: 'animate-glow-drift-b', delay: '-4s' }, // синий — верх-право
  { pos: '-bottom-[22%] -left-[12%]', size: 'h-[520px] w-[520px]', color: '#ffb005', anim: 'animate-glow-drift-d', delay: '-7s' }, // янтарь — низ-лево
  { pos: '-bottom-[18%] -right-[15%]', size: 'h-[560px] w-[560px]', color: '#fa3d1d', anim: 'animate-glow-drift-b', delay: '-11s' }, // красный — низ-право
  { pos: 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2', size: 'h-[640px] w-[640px]', color: '#e1e1fe', anim: 'animate-glow-drift-c', delay: '0s', center: true }, // лаванда — мягкий центр
]

/**
 * Ambient prism glow в духе hero Dia Browser. Спектральные пятна по углам,
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
            opacity: isDark ? (b.center ? 0.3 : 0.55) : b.center ? 0.15 : 0.26,
            animationDelay: b.delay,
          }}
        />
      ))}
    </div>
  )
}
