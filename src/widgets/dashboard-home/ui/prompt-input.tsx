// src/widgets/dashboard-home/ui/prompt-input.tsx
'use client'
import { Plus, Mic, ArrowUp, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useRef, useEffect, useState } from 'react'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { api } from '@/shared/api'
import { useChatStore } from '@/entities/chat'

export const PromptInput = () => {
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()
  const setChatId = useChatStore(state => state.setChatId)
  const addMessage = useChatStore(state => state.addMessage)
  const clearChat = useChatStore(state => state.clearChat)

  useEffect(() => {
    if (searchParams.get('focus') === 'prompt') {
      inputRef.current?.focus()
    }
  }, [searchParams])

  const handleSubmit = async () => {
    if (!prompt.trim() || isLoading) return
    setIsLoading(true)

    try {
      clearChat()

      // 1. Create chat
      const { data: createData } = await api.post('/v1/ai-chat', {
        title: "New project",
        project_name: "New project",
        description: "",
        model: "claude-sonnet-4-20250514"
      })

      const chatId = createData.data.id
      const projectId = createData.data.project_id

      setChatId(chatId)

      // Add user message to local state immediately
      addMessage({
        id: Date.now().toString(),
        role: 'user',
        content: prompt
      })

      // 2. Navigate
      router.push(`/projects/${projectId}`)

      // 3. Send message to chat background
      const { data: messageData } = await api.post(`/v1/ai-chat/new-messages/${chatId}`, {
        content: prompt,
        images: [],
        has_files: false,
        tokens_used: 100
      })

      if (messageData?.data?.content) {
        addMessage({
          id: messageData.data.id || Date.now().toString(),
          role: 'ai',
          content: messageData.data.content
        })
      }

    } catch (e) {
      console.error(e)
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="relative z-10 w-full max-w-3xl px-4 -mt-24">
      <div className="flex flex-col rounded-3xl border border-border-subtle bg-bg-card/80 backdrop-blur-xl p-2.5 shadow-2xl transition-all focus-within:border-primary/20 focus-within:ring-4 focus-within:ring-primary/5">
        {/* Main Input */}
        <input
          ref={inputRef}
          id="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="w-full bg-transparent px-4 pb-8 pt-3 text-[15px] font-medium text-text-main placeholder:text-text-muted outline-none disabled:opacity-50"
          placeholder="Ask Ugen to create a dashboard to..."
        />

        {/* Bottom Actions */}
        <div className="flex items-center justify-between px-2 pb-1">
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors" title="Add attachment">
            <Plus size={20} />
          </button>

          <div className="flex items-center gap-3">
            <button type="button" className="text-sm font-medium text-text-muted hover:text-text-main transition-colors px-1">
              Plan
            </button>
            <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors" title="Voice input">
              <Mic size={18} />
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !prompt.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-hover-bg text-text-main hover:bg-border-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={18} strokeWidth={2.5} className="animate-spin" />
              ) : (
                <ArrowUp size={18} strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
