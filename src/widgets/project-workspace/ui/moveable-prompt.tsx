import { ArrowUp, CornerDownLeft, Trash2, CodeXml } from "lucide-react"
import { useState, useEffect, useRef } from "react"

interface MoveablePromptProps {
  isVisible: boolean
  initialPosition: { x: number, y: number }
  onClose: () => void
  containerRef: React.RefObject<HTMLDivElement | null>
}

export const MoveablePrompt = ({ isVisible, initialPosition, onClose, containerRef }: MoveablePromptProps) => {
  const [position, setPosition] = useState(initialPosition)
  const [value, setValue] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const promptRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPosition(initialPosition)
  }, [initialPosition])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const containerRect = containerRef.current?.getBoundingClientRect()
      if (containerRect) {
        setPosition({
          x: e.clientX - containerRect.left - dragOffset.x,
          y: e.clientY - containerRect.top - dragOffset.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, containerRef])

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) return

    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    const rect = promptRef.current?.getBoundingClientRect()
    if (rect) {
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
    }
  }

  if (!isVisible) return null

  return (
    <div
      ref={promptRef}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      className={`ignore-inspect absolute z-[110] flex items-center bg-white border border-slate-200 rounded-full px-4 py-2 shadow-2xl min-w-[600px] max-w-[800px] transition-opacity duration-300 ${isDragging ? 'opacity-90' : 'opacity-100'}`}
      style={{
        top: position.y,
        left: Math.max(20, position.x),
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe your changes..."
        className="flex-1 bg-transparent border-none outline-none text-slate-800 text-[15px] px-2 py-1 placeholder:text-slate-400"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
      />

      <div className="flex items-center gap-1.5 ml-2">
        <button
          className="bg-slate-900 text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-slate-800 transition-colors shrink-0"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        >
          <ArrowUp size={18} strokeWidth={2.5} />
        </button>

        <div className="w-[1px] h-6 bg-slate-200 mx-2" />

        <button
          className="text-slate-500 hover:text-slate-800 p-1.5 transition-colors"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        >
          <CornerDownLeft size={18} />
        </button>
        <button
          className="text-slate-500 hover:text-slate-800 p-1.5 transition-colors"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        >
          <CodeXml size={18} />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onClose()
          }}
          className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  )
}
