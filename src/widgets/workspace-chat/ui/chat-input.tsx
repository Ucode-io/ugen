import { Paperclip, MousePointerClick, Mic, ArrowUp } from "lucide-react"
import { useState, useRef, KeyboardEvent } from "react"

interface ChatInputProps {
  onSendMessage: (msg: string) => void
}

export const ChatInput = ({ onSendMessage }: ChatInputProps) => {
  const [value, setValue] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    // Auto-resize
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  const handleSend = () => {
    if (value.trim()) {
      onSendMessage(value)
      setValue("")
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex w-full flex-col rounded-[20px] bg-bg-card border border-border-subtle p-2 shadow-sm transition-all focus-within:ring-1 focus-within:ring-border-subtle">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="How can I help you today?"
        className="w-full resize-none bg-transparent px-3 py-3 text-[15px] text-text-main outline-none placeholder:text-text-muted"
        style={{ minHeight: '44px', maxHeight: '200px' }}
      />

      <div className="mt-2 flex items-center justify-between px-1 pb-1">
        {/* Left Side */}
        <div className="flex items-center gap-1">
          <button className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors" title="Attach folder/file">
            <Paperclip size={18} />
          </button>
          <button className="flex h-9 px-3 items-center justify-center gap-2 rounded-full border border-border-subtle text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors text-sm font-medium">
            <MousePointerClick size={16} />
            <span>Visual edits</span>
          </button>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-1">
          <button className="flex h-9 px-4 items-center justify-center rounded-full text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors text-sm font-medium">
            Plan
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors" title="Voice match">
            <Mic size={18} />
          </button>
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-text-main text-bg-main disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all ml-1"
            title="Send (Cmd + Enter)"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}
