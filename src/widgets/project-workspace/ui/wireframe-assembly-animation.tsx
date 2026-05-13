'use client'
import { useChatStore } from '@/entities/chat'
import { Loader2 } from 'lucide-react'

const DURATION = 8

type BlockProps = {
  area: string
  delay: number
  accent?: boolean
  children?: React.ReactNode
}

const Block = ({ area, delay, accent = false, children }: BlockProps) => (
  <div
    style={{
      gridArea: area,
      animation: `wireframe-block ${DURATION}s ease-in-out infinite`,
      animationDelay: `${delay}s`,
      background: accent
        ? 'rgba(59,130,246,0.18)'
        : 'rgba(148,163,184,0.18)',
      border: `1px solid ${accent ? 'rgba(59,130,246,0.35)' : 'rgba(148,163,184,0.25)'}`,
      opacity: 0,
    }}
    className="rounded-md flex flex-col gap-1.5 p-2 overflow-hidden"
  >
    {children}
  </div>
)

const TextBar = ({ w, accent = false }: { w: string; accent?: boolean }) => (
  <div
    className="h-1.5 rounded-full"
    style={{
      width: w,
      background: accent ? 'rgba(59,130,246,0.55)' : 'rgba(148,163,184,0.45)',
    }}
  />
)

export const WireframeAssemblyAnimation = () => {
  const sseEvents = useChatStore((state) => state.sseEvents)
  const latestMessage = [...sseEvents].reverse().find((e) => e?.message)?.message

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg-main px-4 py-8">
      <div className="w-full max-w-[500px] rounded-2xl border border-border-subtle bg-bg-card/40 overflow-hidden shadow-2xl">
        {/* Window header */}
        <div className="flex items-center px-4 py-3 border-b border-border-subtle">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-text-muted/40" />
            <div className="h-2.5 w-2.5 rounded-full bg-text-muted/40" />
            <div className="h-2.5 w-2.5 rounded-full bg-text-muted/40" />
          </div>
        </div>

        {/* Wireframe grid */}
        <div
          className="grid gap-2 p-4 h-[320px]"
          style={{
            gridTemplateColumns: '64px 1fr 1fr 1fr',
            gridTemplateRows: '28px 1fr 56px 36px',
            gridTemplateAreas: `
              "header header header header"
              "side hero hero hero"
              "side card1 card2 card3"
              "side wide wide wide"
            `,
          }}
        >
          {/* Header bar with logo + nav */}
          <Block area="header" delay={0}>
            <div className="flex items-center gap-2 h-full">
              <div className="h-2 w-2 rounded-full bg-primary/60" />
              <TextBar w="40px" />
              <div className="flex-1" />
              <TextBar w="24px" />
              <TextBar w="24px" />
              <TextBar w="24px" />
            </div>
          </Block>

          {/* Sidebar with nav items */}
          <Block area="side" delay={0.25}>
            <TextBar w="70%" />
            <TextBar w="80%" />
            <TextBar w="60%" />
            <TextBar w="80%" />
            <TextBar w="55%" />
          </Block>

          {/* Hero / main section */}
          <Block area="hero" delay={0.5} accent>
            <div className="space-y-1.5 pt-1">
              <TextBar w="55%" accent />
              <TextBar w="80%" />
              <TextBar w="70%" />
            </div>
            <div className="mt-auto">
              <div
                className="h-5 w-20 rounded"
                style={{ background: 'rgba(59,130,246,0.6)' }}
              />
            </div>
          </Block>

          {/* Three cards */}
          <Block area="card1" delay={0.85}>
            <TextBar w="50%" />
            <TextBar w="80%" />
          </Block>
          <Block area="card2" delay={1.0}>
            <TextBar w="55%" />
            <TextBar w="75%" />
          </Block>
          <Block area="card3" delay={1.15}>
            <TextBar w="45%" />
            <TextBar w="80%" />
          </Block>

          {/* Wide bottom block */}
          <Block area="wide" delay={1.45}>
            <TextBar w="40%" />
            <TextBar w="90%" />
          </Block>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2 text-text-main">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span className="text-base font-medium truncate max-w-[420px]">
          {latestMessage || 'Assembling layout...'}
        </span>
      </div>
    </div>
  )
}
