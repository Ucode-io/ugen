import { Paperclip, MousePointerClick, Mic, ArrowUp } from "lucide-react"
import { useState, useRef, KeyboardEvent } from "react"
import { AudioRecorder } from "./audio-recorder";

interface ChatInputProps {
  onSendMessage: (msg: string) => void
  onSendAudio: (blob: Blob, url: string) => void
}

export const ChatInput = ({ onSendMessage, onSendAudio }: ChatInputProps) => {
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
      onSendMessage(value);
      setValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-bg-card border-border-subtle focus-within:ring-border-subtle flex w-full flex-col rounded-[20px] border p-2 shadow-sm transition-all focus-within:ring-1">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder="How can I help you today?"
        className="text-text-main placeholder:text-text-muted w-full resize-none bg-transparent px-3 py-3 text-[15px] outline-none"
        style={{ minHeight: "44px", maxHeight: "200px" }}
      />

      <div className="mt-2 flex items-center justify-between px-1 pb-1">
        {/* Left Side */}
        <div className="flex items-center gap-1">
          <button
            className="text-text-muted hover:bg-hover-bg hover:text-text-main flex h-9 w-9 items-center justify-center rounded-full transition-colors"
            title="Attach folder/file"
          >
            <Paperclip size={18} />
          </button>
          <button className="border-border-subtle text-text-muted hover:bg-hover-bg hover:text-text-main flex h-9 items-center justify-center gap-2 rounded-full border px-3 text-sm font-medium transition-colors">
            <MousePointerClick size={16} />
            <span>Visual edits</span>
          </button>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-1">
          <button className="text-text-muted hover:bg-hover-bg hover:text-text-main flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors">
            Plan
          </button>
          <AudioRecorder onSendAudio={onSendAudio} />
          <button
            onClick={handleSend}
            disabled={!value.trim()}
            className="bg-text-main text-bg-main ml-1 flex h-9 w-9 items-center justify-center rounded-full transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            title="Send (Cmd + Enter)"
          >
            <ArrowUp size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
