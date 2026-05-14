'use client'
import { useChatStore } from '@/entities/chat'
import { Loader2, Folder, FolderOpen, FileCode, Check } from 'lucide-react'

const DURATION = 8

type TreeNode = {
  depth: number
  kind: 'folder' | 'folder-open' | 'file'
  name: string
}

const TREE: TreeNode[] = [
  { depth: 0, kind: 'folder-open', name: 'src' },
  { depth: 1, kind: 'folder-open', name: 'app' },
  { depth: 2, kind: 'file', name: 'page.tsx' },
  { depth: 2, kind: 'file', name: 'layout.tsx' },
  { depth: 1, kind: 'folder-open', name: 'components' },
  { depth: 2, kind: 'file', name: 'button.tsx' },
  { depth: 2, kind: 'file', name: 'card.tsx' },
  { depth: 1, kind: 'folder', name: 'lib' },
  { depth: 0, kind: 'folder', name: 'public' },
  { depth: 0, kind: 'file', name: 'package.json' },
  { depth: 0, kind: 'file', name: 'tsconfig.json' },
]

const STAGGER = 0.22
const CHECK_OFFSET = 0.35

const Icon = ({ kind }: { kind: TreeNode['kind'] }) => {
  const cls = 'shrink-0 text-text-muted'
  if (kind === 'folder') return <Folder size={14} className={cls} />
  if (kind === 'folder-open') return <FolderOpen size={14} className={`${cls} text-primary/80`} />
  return <FileCode size={14} className={cls} />
}

const TreeRow = ({ node, index }: { node: TreeNode; index: number }) => {
  const itemDelay = index * STAGGER
  const checkDelay = itemDelay + CHECK_OFFSET
  const showCheck = node.kind === 'file'

  return (
    <div
      className="flex items-center gap-2 py-1"
      style={{
        opacity: 0,
        paddingLeft: `${node.depth * 16}px`,
        animation: `tree-item ${DURATION}s ease-in-out infinite`,
        animationDelay: `${itemDelay}s`,
      }}
    >
      <Icon kind={node.kind} />
      <span className="text-[13px] font-medium text-text-main/85 tracking-tight">
        {node.name}
      </span>
      {showCheck && (
        <Check
          size={12}
          strokeWidth={3}
          className="ml-auto text-emerald-500"
          style={{
            opacity: 0,
            animation: `tree-check ${DURATION}s ease-in-out infinite`,
            animationDelay: `${checkDelay}s`,
          }}
        />
      )}
    </div>
  )
}

export const TreeBuildingAnimation = () => {
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

        {/* Tree */}
        <div className="px-5 py-4 h-[320px] flex flex-col">
          {TREE.map((node, i) => (
            <TreeRow key={`${node.name}-${i}`} node={node} index={i} />
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2 text-text-main">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span className="text-base font-medium truncate max-w-[420px]">
          {latestMessage || 'Building project structure...'}
        </span>
      </div>
    </div>
  )
}
