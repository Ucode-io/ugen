'use client'
import { useChatStore, type SseEvent } from '@/entities/chat'
import { ScannerAnimation } from './scanner-animation'
import { CodeWritingAnimation } from './code-writing-animation'
import { WireframeAssemblyAnimation } from './wireframe-assembly-animation'
import { TreeBuildingAnimation } from './tree-building-animation'
import { DatabaseTablesAnimation } from './database-tables-animation'

type AnimKind = 'scanner' | 'code' | 'wireframe' | 'tree' | 'database'

const ANIMATIONS: Record<AnimKind, () => React.JSX.Element> = {
  scanner: ScannerAnimation,
  code: CodeWritingAnimation,
  wireframe: WireframeAssemblyAnimation,
  tree: TreeBuildingAnimation,
  database: DatabaseTablesAnimation,
}

// Cycle through these every 4 SSE events. `database` is reserved for table events only.
const CYCLE: AnimKind[] = ['scanner', 'code', 'wireframe', 'tree']
const EVENTS_PER_STEP = 4

function isTableEvent(ev: SseEvent | undefined) {
  return ev?.type === 'table_start' || ev?.type === 'table_done'
}

function pickAnimationKind(events: SseEvent[]): AnimKind {
  if (isTableEvent(events[events.length - 1])) return 'database'
  const idx = Math.floor(events.length / EVENTS_PER_STEP) % CYCLE.length
  return CYCLE[idx]
}

export const ProjectBuildingAnimation = () => {
  const sseEvents = useChatStore((state) => state.sseEvents)
  const kind = pickAnimationKind(sseEvents)
  const Animation = ANIMATIONS[kind]

  // `key={kind}` remounts the animation when the kind changes so entrance
  // animations play from the start, giving a clean visual transition.
  return (
    <div key={kind} className="flex-1 flex flex-col animate-in fade-in duration-500">
      <Animation />
    </div>
  )
}
