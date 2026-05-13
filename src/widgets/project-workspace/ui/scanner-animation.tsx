'use client'
import { useChatStore } from '@/entities/chat'
import { Loader2 } from 'lucide-react'

const WindowFrame = ({ accent = false }: { accent?: boolean }) => {
  const stroke = accent ? 'var(--color-glow-primary, #3B82F6)' : 'currentColor'
  const gridId = accent ? 'scanner-grid-accent' : 'scanner-grid-base'
  const clipId = accent ? 'scanner-clip-accent' : 'scanner-clip-base'

  return (
    <svg
      viewBox="0 0 500 400"
      fill="none"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ color: accent ? undefined : 'rgba(148,163,184,0.25)' }}
    >
      <defs>
        <pattern id={gridId} width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke={stroke} strokeWidth="1" />
        </pattern>
        <clipPath id={clipId}>
          <rect x="50" y="100" width="400" height="250" />
        </clipPath>
      </defs>

      <rect x="50" y="50" width="400" height="300" rx="18" fill="none" stroke={stroke} strokeWidth="2" />
      <line x1="50" y1="100" x2="450" y2="100" stroke={stroke} strokeWidth="1.5" />
      <circle cx="80" cy="75" r="5" fill={stroke} />
      <circle cx="100" cy="75" r="5" fill={stroke} />
      <circle cx="120" cy="75" r="5" fill={stroke} />

      <g clipPath={`url(#${clipId})`}>
        <rect x="50" y="100" width="400" height="250" fill={`url(#${gridId})`} />
        <path
          d="M 130 320 L 250 170 L 370 320 Z"
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  )
}

export const ScannerAnimation = () => {
  const sseEvents = useChatStore((state) => state.sseEvents)
  const latestMessage = [...sseEvents].reverse().find((e) => e?.message)?.message

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-main px-4 py-8">
      <div className="relative w-full max-w-[500px] aspect-[5/4]">
        <div className="absolute inset-0">
          <WindowFrame />
        </div>

        <div
          className="absolute inset-0"
          style={{ animation: 'scanner-fill 3s ease-in-out infinite' }}
        >
          <WindowFrame accent />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(to bottom, rgba(59,130,246,0.18), rgba(59,130,246,0.04))',
            }}
          />
        </div>

        <div
          className="absolute left-0 right-0 h-[2px] pointer-events-none z-10"
          style={{
            top: 0,
            background:
              'linear-gradient(to right, transparent, var(--color-glow-primary, #3B82F6), transparent)',
            boxShadow: '0 0 12px rgba(59,130,246,0.85), 0 0 24px rgba(59,130,246,0.45)',
            animation: 'scanner-line 3s ease-in-out infinite',
          }}
        />
      </div>

      <div className="mt-8 flex items-center gap-2 text-text-main">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span className="text-base font-medium truncate max-w-[420px]">
          {latestMessage || 'Setting up project...'}
        </span>
      </div>
    </div>
  )
}
