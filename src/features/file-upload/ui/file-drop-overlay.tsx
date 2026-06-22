'use client'

import { Upload } from 'lucide-react'
import { cn } from '@/shared/lib/utils/cn'

interface FileDropOverlayProps {
  /** Drives the fade-in. Pair with `useFileDrop().isDragging`. */
  active: boolean
  label?: string
  className?: string
}

/**
 * Drag-and-drop hint that fills its nearest positioned ancestor. The container
 * must be `relative` (and usually `overflow-hidden`); `rounded-[inherit]` makes
 * the dashed border follow the container's corner radius. Always rendered so it
 * can fade, and `pointer-events-none` so it never blocks the drop.
 */
export const FileDropOverlay = ({
  active,
  label = 'Drop files to upload',
  className,
}: FileDropOverlayProps) => (
  <div
    aria-hidden
    className={cn(
      'pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-[inherit]',
      'border-2 border-dashed border-primary bg-bg-card/80 backdrop-blur-sm',
      'transition-opacity duration-150',
      active ? 'opacity-100' : 'opacity-0',
      className,
    )}
  >
    <div className="text-primary flex flex-col items-center gap-2">
      <Upload className="h-6 w-6 animate-bounce" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  </div>
)
