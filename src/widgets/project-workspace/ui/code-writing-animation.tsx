'use client'
import { useChatStore } from '@/entities/chat'
import { Loader2 } from 'lucide-react'

type Bar = {
  w: string
  ml?: string
  color?: 'slate' | 'slate-light' | 'teal' | 'blue' | 'dot'
}

type Row = Bar[]

const COLORS: Record<NonNullable<Bar['color']>, string> = {
  slate: 'rgba(100,116,139,0.55)',
  'slate-light': 'rgba(148,163,184,0.45)',
  teal: 'rgba(20,184,166,0.55)',
  blue: 'rgba(59,130,246,0.55)',
  dot: 'rgba(100,116,139,0.55)',
}

const ROWS: Row[] = [
  [{ w: '28%', color: 'slate' }],
  [{ w: '58%', color: 'slate-light' }],
  [{ w: '68%', color: 'slate-light' }],
  [{ w: '8px', ml: '6%', color: 'dot' }],
  [{ w: '8px', ml: '12%', color: 'dot' }],
  [
    { w: '22%', color: 'slate-light' },
    { w: '16%', color: 'teal' },
    { w: '22%', color: 'slate-light' },
    { w: '8px', color: 'dot' },
  ],
  [
    { w: '18%', color: 'blue' },
    { w: '22%', color: 'slate-light' },
    { w: '16%', color: 'blue' },
    { w: '26%', color: 'slate-light' },
  ],
  [
    { w: '18%', color: 'blue' },
    { w: '14%', color: 'slate-light' },
  ],
  [{ w: '40%', color: 'slate-light', ml: '4%' }],
  [
    { w: '22%', ml: '4%', color: 'slate-light' },
    { w: '18%', color: 'teal' },
  ],
  [{ w: '34%', color: 'slate' }],
]

const CodeRow = ({ row, rowIdx }: { row: Row; rowIdx: number }) => {
  if (row.length === 0) return <div className="h-2.5" />
  return (
    <div className="flex items-center gap-2" key={rowIdx}>
      {row.map((bar, i) => {
        const isDot = bar.color === 'dot' && bar.w.endsWith('px')
        return (
          <div
            key={i}
            className={isDot ? 'h-1.5 w-1.5 rounded-full shrink-0' : 'h-2.5 rounded-full'}
            style={{
              width: bar.w,
              marginLeft: bar.ml,
              background: COLORS[bar.color ?? 'slate'],
            }}
          />
        )
      })}
    </div>
  )
}

const CodeBlock = ({ ariaHidden = false }: { ariaHidden?: boolean }) => (
  <div
    aria-hidden={ariaHidden}
    className="flex flex-col gap-3 px-6 py-4"
  >
    {ROWS.map((row, i) => (
      <CodeRow key={i} row={row} rowIdx={i} />
    ))}
  </div>
)

export const CodeWritingAnimation = () => {
  const sseEvents = useChatStore((state) => state.sseEvents)
  const latestMessage = [...sseEvents].reverse().find((e) => e?.message)?.message

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-main px-4 py-8">
      <div className="w-full max-w-[500px] rounded-2xl border border-border-subtle bg-bg-card/40 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative flex items-center px-4 py-3 border-b border-border-subtle">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-text-muted/40" />
            <div className="h-2.5 w-2.5 rounded-full bg-text-muted/40" />
            <div className="h-2.5 w-2.5 rounded-full bg-text-muted/40" />
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 text-sm text-text-muted font-medium tracking-wide">
            /app/page.tsx
          </div>
        </div>

        {/* Code body with scrolling */}
        <div className="relative h-[300px] overflow-hidden">
          <div
            className="flex flex-col"
            style={{ animation: 'code-scroll-up 12s linear infinite' }}
          >
            <CodeBlock />
            <CodeBlock ariaHidden />
          </div>

          {/* Top/bottom fades for seamless edges */}
          <div
            className="pointer-events-none absolute top-0 left-0 right-0 h-10"
            style={{ background: 'linear-gradient(to bottom, var(--color-bg-card, #000) 0%, transparent 100%)' }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-10"
            style={{ background: 'linear-gradient(to top, var(--color-bg-card, #000) 0%, transparent 100%)' }}
          />
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2 text-text-main">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span className="text-base font-medium truncate max-w-[420px]">
          {latestMessage || 'Writing code...'}
        </span>
      </div>
    </div>
  )
}
