'use client'
import { Plus, ArrowUp, Loader2, X, FileIcon } from 'lucide-react'
import { useRef, useEffect, useState, ClipboardEvent, DragEvent } from 'react'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { api } from '@/shared/api'
import { useChatStore } from '@/entities/chat'
import { AudioRecorder } from '@/shared/ui'
import { useFileUpload } from '@/shared/hooks/useFileUpload'
import { ModelSelector, DEFAULT_MODEL_ID } from '@/entities/ai-model'
import { useAuthStore } from '@/entities/session'

const CHIPS = [
  { label: '💼 Sales dashboard', text: 'A SaaS dashboard for tracking sales' },
  { label: '📅 Booking app', text: 'A booking app with Stripe payments' },
  { label: '🎉 HR onboarding', text: 'An employee onboarding portal' },
  { label: '📣 Landing page', text: 'A landing page with email capture' },
  { label: '📦 Inventory tool', text: 'An inventory management system' },
]

export const LandingHeroSection = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlanOn, setIsPlanOn] = useState(false)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID)

  const { uploadFile, uploadedFiles, removeFile, isUploading } = useFileUpload()
  const { isAuthenticated } = useAuthStore()
  const router = useRouter()
  const setChatId = useChatStore(state => state.setChatId)
  const setProjectId = useChatStore(state => state.setProjectId)
  const setPendingPrompt = useChatStore(state => state.setPendingPrompt)
  const clearChat = useChatStore(state => state.clearChat)

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [prompt])

  const handleSubmit = async () => {
    if ((!prompt.trim() && uploadedFiles.length === 0) || isProcessing || isUploading) return

    if (!isAuthenticated) {
      window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }))
      return
    }

    setIsProcessing(true)
    try {
      clearChat()
      const { data: createData } = await api.post('/v1/ai-chat', {
        title: prompt.slice(0, 30) || 'New Project',
        project_name: prompt.slice(0, 20) || 'New Project',
        description: '',
        model: selectedModel,
      })
      const chatId = createData.data.id
      const projectId = createData.data.project_id
      setChatId(chatId)
      setProjectId(projectId)
      setPendingPrompt({
        content: prompt,
        images: uploadedFiles.map(f => f.url),
        model: selectedModel,
      })
      router.push(`/projects/${projectId}`)
    } catch (e) {
      console.error(e)
      setIsProcessing(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.metaKey && !e.shiftKey) {
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
    <section className="relative flex flex-col items-center justify-center text-center px-6 border-b border-border-subtle"
      style={{ paddingTop: 'calc(64px + 72px)', paddingBottom: '80px' }}>

      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-bg-card border border-border-subtle text-text-muted mb-7 text-[11px] font-semibold uppercase tracking-[0.12em]">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
        AI-powered development platform
      </div>

      {/* H1 */}
      <h1 className="font-black tracking-[-0.05em] leading-[1.02] text-text-main mb-[18px] max-w-[840px]"
        style={{ fontSize: 'clamp(2.8rem, 6vw, 5rem)' }}>
        Build your own product{' '}
        <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          in 15 minutes
        </em>
      </h1>

      {/* Subtitle */}
      <p className="text-[1.05rem] text-text-muted mb-11 max-w-[500px] leading-[1.7]">
        Create apps and websites with AI — no engineering degree required.
      </p>

      {/* Prompt Input */}
      <div className="w-full max-w-[680px] mb-5">
        <div
          className="relative overflow-hidden flex flex-col rounded-3xl border border-border-subtle bg-bg-card/80 backdrop-blur-xl p-2.5 shadow-2xl transition-all focus-within:border-primary/20 focus-within:ring-4 focus-within:ring-primary/5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {/* File Previews */}
          {uploadedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 px-3 pt-2">
              {uploadedFiles.map((file) => {
                const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name)
                return (
                  <div key={file.id} className="relative group bg-bg-main border border-border-subtle rounded-lg p-2 flex items-center gap-2 max-w-[200px]">
                    {isImage ? (
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border-subtle">
                        {/* eslint-disable-next-line */}
                        <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="bg-border-subtle p-1.5 rounded-md text-text-muted">
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
                )
              })}
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            disabled={isProcessing}
            rows={1}
            className="w-full bg-transparent px-4 pb-8 pt-3 text-[15px] font-medium text-text-main placeholder:text-text-muted outline-none disabled:opacity-50 min-h-[44px] max-h-[200px] resize-none"
            placeholder="Ask u-gen to build your app…"
          />

          {/* Bottom Bar */}
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
              >
                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
              </button>
              <ModelSelector
                value={selectedModel}
                onValueChange={setSelectedModel}
                triggerClassName="h-8"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className={`text-sm font-medium text-text-muted hover:text-text-main transition-colors px-3 py-1 rounded-full ${isPlanOn ? 'bg-text-main text-bg-main' : 'hover:bg-hover-bg'}`}
                onClick={() => setIsPlanOn(!isPlanOn)}
              >
                Build
              </button>
              <AudioRecorder
                onTranscription={(text) => setPrompt(prev => prev + (prev ? ' ' : '') + text)}
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

      {/* Chips */}
      <div className="flex flex-wrap gap-[7px] justify-center max-w-[680px]">
        {CHIPS.map((chip) => (
          <button
            key={chip.text}
            type="button"
            onClick={() => { setPrompt(chip.text); textareaRef.current?.focus() }}
            className="inline-flex items-center gap-[5px] bg-bg-card border border-border-subtle rounded-full px-[13px] py-[5px] text-[0.78rem] text-text-muted cursor-pointer transition-all whitespace-nowrap hover:border-border-subtle/60 hover:text-text-main hover:bg-hover-bg"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </section>
  )
}
