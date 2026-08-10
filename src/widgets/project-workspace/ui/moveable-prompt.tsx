import { ArrowLeft, ArrowUp, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { cn } from "@/shared/lib/utils/cn"
import { useTranslations } from 'next-intl'

interface MoveablePromptProps {
  isVisible: boolean
  initialPosition: { x: number; y: number }
  containerRef: React.RefObject<HTMLDivElement | null>
  onBack: () => void
  onClose: () => void
  onSubmit?: (text: string) => void
  isSending?: boolean
}

export const MoveablePrompt = ({
  isVisible, initialPosition, containerRef, onBack, onClose, onSubmit, isSending = false,
}: MoveablePromptProps) => {
  const t = useTranslations('widgets.projectWorkspace')
  const [position, setPosition] = useState(initialPosition)
  const [value, setValue] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const promptRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setPosition(initialPosition) }, [initialPosition])

  useEffect(() => {
    if (isVisible) {
      setValue("")
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isVisible])

  useEffect(() => {
    if (!isDragging) return
    const onMove = (e: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) setPosition({ x: e.clientX - rect.left - dragOffset.x, y: e.clientY - rect.top - dragOffset.y })
    }
    const onUp = () => setIsDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [isDragging, dragOffset, containerRef])

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('input, button')) return
    e.preventDefault(); e.stopPropagation()
    setIsDragging(true)
    const rect = promptRef.current?.getBoundingClientRect()
    if (rect) setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleSubmit = () => {
    const text = value.trim()
    if (!text || isSending) return
    onSubmit?.(text)
    setValue("")
  }

  if (!isVisible) return null

  return (
    <div
      ref={promptRef}
      onMouseDown={handleMouseDown}
      onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
      className={cn(
        "ignore-inspect absolute z-110 flex items-center gap-1 bg-bg-card border border-border-subtle rounded-xl px-1.5 py-1.5 shadow-2xl",
        isDragging ? "opacity-90" : "opacity-100"
      )}
      style={{
        top: position.y,
        left: Math.max(20, position.x),
        cursor: isDragging ? 'grabbing' : 'grab',
        minWidth: 340,
      }}
    >
      {/* Back */}
      <button
        type="button"
        title={t('backToStyleEditor')}
        onClick={(e) => { e.stopPropagation(); onBack() }}
        className="h-7 w-7 flex items-center justify-center rounded-lg text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors shrink-0"
      >
        <ArrowLeft size={14} />
      </button>

      <div className="w-px h-4 bg-border-subtle mx-0.5" />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={isSending}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.stopPropagation(); onBack(); return }
          if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleSubmit() }
        }}
        placeholder={t('describeChanges')}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.preventDefault(); e.stopPropagation() }}
        className="flex-1 bg-transparent border-none outline-none text-text-main text-[13px] px-1 placeholder:text-text-muted min-w-0 disabled:opacity-50"
      />

      {/* Send */}
      <button
        type="button"
        title={t('send')}
        onClick={(e) => { e.stopPropagation(); handleSubmit() }}
        disabled={!value.trim() || isSending}
        className="h-7 w-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        <ArrowUp size={13} strokeWidth={2.5} />
      </button>

      <div className="w-px h-4 bg-border-subtle mx-0.5" />

      {/* Close all */}
      <button
        type="button"
        title={t('close')}
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="h-7 w-7 flex items-center justify-center rounded-lg text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors shrink-0"
      >
        <X size={13} />
      </button>
    </div>
  )
}
