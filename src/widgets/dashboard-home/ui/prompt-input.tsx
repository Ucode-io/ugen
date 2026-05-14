// src/widgets/dashboard-home/ui/prompt-input.tsx
'use client'
import { Plus, ArrowUp, Loader2, X, FileIcon, Users, ShoppingCart, Package, ListTodo, UtensilsCrossed } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useRef, useEffect, useState, ClipboardEvent, DragEvent } from 'react'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { api } from '@/shared/api'
import { useChatStore } from '@/entities/chat'
import { AudioRecorder } from '@/shared/ui'
import { useFileUpload } from '@/shared/hooks/useFileUpload'
import { DEFAULT_MODEL_ID } from '@/entities/ai-model'
import { useTranslations } from 'next-intl'

const PRESET_PROMPTS = [
  { text: 'Build a CRM system with contacts and sales pipeline', icon: Users },
  { text: 'Create an e-commerce store with product catalog', icon: ShoppingCart },
  { text: 'Build an ERP system with inventory and finance modules', icon: Package },
  { text: 'Build a task management app with kanban board', icon: ListTodo },
  { text: 'Create a restaurant website with menu and booking', icon: UtensilsCrossed },
]

export const PromptInput = () => {
  const t = useTranslations('widgets.dashboard')
  const searchParams = useSearchParams()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const { uploadFile, uploadedFiles, removeFile, isUploading } = useFileUpload()

  const router = useRouter()
  const setChatId = useChatStore(state => state.setChatId)
  const setProjectId = useChatStore(state => state.setProjectId)
  const setPendingPrompt = useChatStore(state => state.setPendingPrompt)
  const addMessage = useChatStore(state => state.addMessage)
  const clearChat = useChatStore(state => state.clearChat)

  useEffect(() => {
    if (searchParams.get('focus') === 'prompt') {
      textareaRef.current?.focus()
    }
  }, [searchParams])

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [prompt])

  const handleSubmit = async () => {
    if ((!prompt.trim() && uploadedFiles.length === 0) || isProcessing || isUploading) return
    setIsProcessing(true)

    try {
      clearChat()

      // 1. Create chat
      const { data: createData } = await api.post('/v1/ai-chat', {
        title: prompt.slice(0, 30) || t("newProject"),
        project_name: prompt.slice(0, 20) || t("newProject"),
        description: "",
        model: DEFAULT_MODEL_ID
      })

      const chatId = createData.data.id
      const projectId = createData.data.project_id

      setChatId(chatId)
      setProjectId(projectId)
      setPendingPrompt({
        content: prompt,
        images: uploadedFiles.map(f => f.url),
        model: DEFAULT_MODEL_ID
      })

      // 2. Navigate
      router.push(`/projects/${projectId}`)

    } catch (e) {
      console.error(e)
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      // If Command+Enter or Shift+Enter, allow new line
      if (e.metaKey || e.shiftKey) {
        return
      }

      // Otherwise, submit
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
    <div className="relative z-10 w-full max-w-3xl px-4 flex flex-col items-center gap-5">
      {/* Heading */}
      <div className="text-center">
        <h1 className="text-[2.5rem] font-bold tracking-tight text-text-main leading-tight mb-2">
          What will you build today?
        </h1>
        <p className="text-text-muted text-base">
          Describe your idea and let AI turn it into a working product
        </p>
      </div>

      <div
        className="relative overflow-hidden w-full flex flex-col rounded-3xl border border-border-subtle bg-bg-card/80 backdrop-blur-xl p-2.5 shadow-2xl transition-all focus-within:border-primary/20 focus-within:ring-4 focus-within:ring-primary/5"
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
        <textarea
          ref={textareaRef}
          id="prompt-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          disabled={isProcessing}
          rows={1}
          className="w-full bg-transparent px-4 pb-8 pt-3 text-[15px] font-medium text-text-main placeholder:text-text-muted outline-none disabled:opacity-50 min-h-[44px] max-h-[200px] resize-none"
          placeholder={t("promptPlaceholder")}
        />

        {/* Bottom Actions */}
        <div className="flex items-center justify-between px-2 pb-1">
          <div className="flex items-center gap-1">
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
              title={t("addAttachment")}
            >
              {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
            </button>
          </div>

          <div className="flex items-center gap-3">
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

      {/* Preset prompts */}
      <div className="flex flex-wrap justify-center gap-2">
        {PRESET_PROMPTS.map(({ text, icon: Icon }) => (
          <button
            key={text}
            type="button"
            disabled={isProcessing}
            onClick={() => {
              setPrompt(text)
              textareaRef.current?.focus()
            }}
            className="flex items-center gap-1.5 border border-border-subtle rounded-full px-3 py-1.5 text-xs text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors disabled:opacity-50 max-w-65"
          >
            <Icon size={14} className="shrink-0" />
            <span className="truncate">{text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

