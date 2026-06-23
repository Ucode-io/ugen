'use client'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

// Глаголы, которые «перелистываются» в заголовке (как Chat → Write в Dia).
const WORDS = ['build', 'ship', 'design', 'launch', 'automate']

// Dashboard brand spectrum для заливки слова. Зациклен (первый цвет
// повторяется в конце), чтобы бесконечный блик переливался бесшовно.
const HOLO =
  'linear-gradient(90deg, var(--color-glow-primary, #3B82F6) 0%, var(--color-glow-secondary, #44A5DF) 24%, var(--color-glow-tertiary, #06B6D4) 48%, #8b5cf6 72%, var(--color-glow-primary, #3B82F6) 100%)'

// Фирменная «театральная» кривая и единая длительность для всех движений.
const EASE: [number, number, number, number] = [0.77, 0, 0.175, 1]
const DUR = 0.5

const wordStyle = {
  backgroundImage: HOLO,
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
} as const

/**
 * Заголовок дашборда с перелистывающимся brand-словом-голограммой.
 * Слово циклически меняется со спектральной заливкой и блеском;
 * переход — размытие + сдвиг. Ширина «слота» анимируется к реальной ширине
 * активного слова (измеряем через скрытые сайзеры), поэтому соседнее «today?»
 * плавно подъезжает через обычный flex-reflow — без рывков и искажения текста.
 * Уважает prefers-reduced-motion: тогда слово статично.
 */
export const AnimatedHeadline = () => {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const word = WORDS[i]

  // Ширина каждого слова в текущем шрифте — чтобы плавно «дышать» слотом.
  const sizerRefs = useRef<(HTMLSpanElement | null)[]>([])
  const [widths, setWidths] = useState<number[]>([])

  useEffect(() => {
    const measure = () =>
      setWidths(sizerRefs.current.map(el => el?.offsetWidth ?? 0))
    measure()
    window.addEventListener('resize', measure)
    // Ширина зависит от шрифта — пере-замер после его загрузки.
    document.fonts?.ready.then(measure).catch(() => {})
    return () => window.removeEventListener('resize', measure)
  }, [])

  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setI(p => (p + 1) % WORDS.length), 2800)
    return () => clearInterval(id)
  }, [reduce])

  const width = widths[i]

  return (
    <h1 className="mb-2 flex flex-wrap items-center justify-center gap-x-[0.28em] text-[2.5rem] font-bold leading-tight tracking-tight text-text-main">
      <span>What will you</span>

      <motion.span
        className="relative inline-grid"
        animate={width != null ? { width } : undefined}
        transition={{ duration: DUR, ease: EASE }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={word}
            className="animate-holo-shimmer col-start-1 row-start-1 min-w-0 justify-self-center whitespace-nowrap"
            style={wordStyle}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: 'blur(10px)' }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -12, filter: 'blur(10px)' }}
            transition={{ duration: DUR, ease: EASE }}
          >
            {word}
          </motion.span>
        </AnimatePresence>
      </motion.span>

      <span>today?</span>

      {/* Скрытые сайзеры: меряем ширину слов вне потока, на верстку не влияют */}
      <span aria-hidden className="pointer-events-none absolute -left-[9999px] top-0 whitespace-nowrap">
        {WORDS.map((w, idx) => (
          <span
            key={w}
            ref={el => {
              sizerRefs.current[idx] = el
            }}
          >
            {w}
          </span>
        ))}
      </span>
    </h1>
  )
}
