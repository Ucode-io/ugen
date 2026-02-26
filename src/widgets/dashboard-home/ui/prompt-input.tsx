// src/widgets/dashboard-home/ui/prompt-input.tsx
import { Plus, Mic, ArrowUp } from 'lucide-react'

export const PromptInput = () => {
  return (
    <div className="relative z-10 w-full max-w-3xl px-4 -mt-24">
      <div className="flex flex-col rounded-3xl border border-border-subtle bg-bg-card/80 backdrop-blur-xl p-2.5 shadow-2xl transition-all focus-within:border-primary/20 focus-within:ring-4 focus-within:ring-primary/5">
        {/* Main Input */}
        <input
          className="w-full bg-transparent px-4 pb-8 pt-3 text-[15px] font-medium text-text-main placeholder:text-text-muted outline-none"
          placeholder="Ask Ugen to create a dashboard to..."
        />

        {/* Bottom Actions */}
        <div className="flex items-center justify-between px-2 pb-1">
          <button className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors" title="Add attachment">
            <Plus size={20} />
          </button>

          <div className="flex items-center gap-3">
            <button className="text-sm font-medium text-text-muted hover:text-text-main transition-colors px-1">
              Plan
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors" title="Voice input">
              <Mic size={18} />
            </button>
            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-hover-bg text-text-main hover:bg-border-subtle transition-colors">
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
