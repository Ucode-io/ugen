'use client'
import { useChatStore } from '@/entities/chat'
import { Loader2, Database } from 'lucide-react'

const DURATION = 8
const TABLE_STAGGER = 0.7
const ROW_STAGGER = 0.18
const ROW_INITIAL_OFFSET = 0.25

type Column = { name: string; type: string; key?: 'pk' | 'fk' }
type Table = { name: string; columns: Column[] }

const TABLES: Table[] = [
  {
    name: 'users',
    columns: [
      { name: 'id', type: 'uuid', key: 'pk' },
      { name: 'name', type: 'text' },
      { name: 'email', type: 'text' },
      { name: 'role', type: 'enum' },
    ],
  },
  {
    name: 'products',
    columns: [
      { name: 'id', type: 'uuid', key: 'pk' },
      { name: 'title', type: 'text' },
      { name: 'price', type: 'numeric' },
      { name: 'stock', type: 'int' },
    ],
  },
  {
    name: 'orders',
    columns: [
      { name: 'id', type: 'uuid', key: 'pk' },
      { name: 'user_id', type: 'uuid', key: 'fk' },
      { name: 'product_id', type: 'uuid', key: 'fk' },
      { name: 'qty', type: 'int' },
    ],
  },
]

const KeyBadge = ({ kind }: { kind: 'pk' | 'fk' }) => {
  const isPk = kind === 'pk'
  return (
    <span
      className="inline-flex items-center justify-center h-3 w-3 rounded-[3px] shrink-0 text-[8px] font-bold"
      style={{
        background: isPk ? 'rgba(59,130,246,0.9)' : 'rgba(20,184,166,0.85)',
        color: '#0b1220',
      }}
    >
      {isPk ? 'P' : 'F'}
    </span>
  )
}

const TableCard = ({ table, index }: { table: Table; index: number }) => {
  const tableDelay = index * TABLE_STAGGER

  return (
    <div
      className="flex flex-col rounded-lg border border-border-subtle bg-bg-card/60 overflow-hidden"
      style={{
        opacity: 0,
        animation: `wireframe-block ${DURATION}s ease-in-out infinite`,
        animationDelay: `${tableDelay}s`,
      }}
    >
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-border-subtle bg-bg-card/40">
        <Database size={11} className="text-primary shrink-0" />
        <span className="text-[11px] font-semibold text-text-main truncate">
          {table.name}
        </span>
      </div>
      <div className="flex flex-col">
        {table.columns.map((col, i) => {
          const rowDelay = tableDelay + ROW_INITIAL_OFFSET + i * ROW_STAGGER
          return (
            <div
              key={col.name}
              className="flex items-center justify-between gap-1.5 px-2.5 py-1 border-b border-border-subtle/40 last:border-b-0"
              style={{
                opacity: 0,
                animation: `tree-item ${DURATION}s ease-in-out infinite`,
                animationDelay: `${rowDelay}s`,
              }}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {col.key && <KeyBadge kind={col.key} />}
                <span className="text-[11px] text-text-main/85 truncate font-medium">
                  {col.name}
                </span>
              </div>
              <span className="text-[9px] text-text-muted uppercase tracking-wide shrink-0">
                {col.type}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const DatabaseTablesAnimation = () => {
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

        {/* Tables grid */}
        <div className="px-4 py-4 h-[320px] grid grid-cols-3 gap-3 content-start">
          {TABLES.map((table, i) => (
            <TableCard key={table.name} table={table} index={i} />
          ))}
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2 text-text-main">
        <Loader2 size={16} className="animate-spin text-primary" />
        <span className="text-base font-medium truncate max-w-[420px]">
          {latestMessage || 'Creating database tables...'}
        </span>
      </div>
    </div>
  )
}
