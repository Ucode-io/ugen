// src/widgets/dashboard-home/ui/prompt-input.tsx
'use client'
import { Plus, ArrowUp, Loader2, X, FileIcon } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useRef, useEffect, useState, ClipboardEvent, DragEvent } from 'react'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { api } from '@/shared/api'
import { useChatStore } from '@/entities/chat'
import { AudioRecorder } from '@/shared/ui/audio-recorder'
import { useFileUpload } from '@/shared/hooks/use-file-upload'

export const PromptInput = () => {
  const searchParams = useSearchParams()
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlanOn, setIsPlanOn] = useState(false)

  const { uploadFile, uploadedFiles, removeFile, isUploading } = useFileUpload()

  const router = useRouter()
  const setChatId = useChatStore(state => state.setChatId)
  const setProjectId = useChatStore(state => state.setProjectId)
  const addMessage = useChatStore(state => state.addMessage)
  const clearChat = useChatStore(state => state.clearChat)

  const handleTogglePlan = () => {
    setIsPlanOn(!isPlanOn)
  }

  useEffect(() => {
    if (searchParams.get('focus') === 'prompt') {
      inputRef.current?.focus()
    }
  }, [searchParams])

  const handleSubmit = async () => {
    if ((!prompt.trim() && uploadedFiles.length === 0) || isProcessing || isUploading) return
    setIsProcessing(true)

    try {
      clearChat()

      // 1. Create chat
      const { data: createData } = await api.post('/v1/ai-chat', {
        title: prompt.slice(0, 30) || "New project",
        project_name: prompt.slice(0, 20) || "New project",
        description: "",
        model: "claude-sonnet-4-20250514"
      })

      const chatId = createData.data.id
      const projectId = createData.data.project_id

      setChatId(chatId)
      setProjectId(projectId)

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
        images: uploadedFiles.map(f => f.url),
        has_files: uploadedFiles.length > 0,
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
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i])
      }
    }
  }

  const handlePaste = async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile()
          if (file) await uploadFile(file)
        }
      }
    }
  }

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files) {
      for (let i = 0; i < files.length; i++) {
        await uploadFile(files[i])
      }
    }
  }

  return (
    <div className="relative z-10 w-full max-w-3xl px-4 -mt-24">
      <div
        className="relative overflow-hidden flex flex-col rounded-3xl border border-border-subtle bg-bg-card/80 backdrop-blur-xl p-2.5 shadow-2xl transition-all focus-within:border-primary/20 focus-within:ring-4 focus-within:ring-primary/5"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* File Previews */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-2">
            {uploadedFiles.map((file) => {
              const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);
              return (
                <div key={file.id} className="relative group bg-bg-main border border-border-subtle rounded-lg p-2 flex items-center gap-2 max-w-[200px]">
                  {isImage ? (
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border-subtle">
                      {/* eslint-disable-next-line */}
                      <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="bg-border-subtle p-1.5 rounded-md text-text-muted transition-colors group-hover:text-text-main">
                      <FileIcon size={16} />
                    </div>
                  )}
                  <span className="text-xs text-text-main truncate font-medium">{file.name}</span>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute -top-1.5 -right-1.5 z-10 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Main Input */}
        <input
          ref={inputRef}
          id="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={isProcessing}
          className="w-full bg-transparent px-4 pb-8 pt-3 text-[15px] font-medium text-text-main placeholder:text-text-muted outline-none disabled:opacity-50"
          placeholder="Ask Ugen to create a dashboard to..."
        />

        {/* Bottom Actions */}
        <div className="flex items-center justify-between px-2 pb-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors disabled:opacity-50"
            title="Add attachment"
          >
            {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className={
                `text-sm font-medium text-text-muted hover:text-text-main transition-colors px-2 py-1 rounded-full  ${isPlanOn ? "bg-text-main text-bg-main" : ""}`
              }
              onClick={handleTogglePlan}
            >
              Plan
            </button>
            <AudioRecorder
              onTranscription={(text) => setPrompt(prev => prev + (prev ? " " : "") + text)}
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isProcessing || (!prompt.trim() && uploadedFiles.length === 0) || isUploading}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-hover-bg text-text-main hover:bg-border-subtle transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
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
