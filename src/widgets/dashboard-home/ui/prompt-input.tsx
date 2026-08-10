// src/widgets/dashboard-home/ui/prompt-input.tsx
'use client'
import { Plus, ArrowUp, Loader2, Users, ShoppingCart, Package, ListTodo, UtensilsCrossed, Sparkles, Check, ChevronDown } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useRef, useEffect, useState, ClipboardEvent } from 'react'
import { useRouter } from '@/shared/lib/i18n/navigation'
import { api } from '@/shared/api'
import { useChatStore } from '@/entities/chat'
import { AudioRecorder, Popover, PopoverContent, PopoverTrigger } from '@/shared/ui'
import { useFileUpload } from '@/shared/hooks/useFileUpload'
import { AttachmentPreviews, FileDropOverlay, useFileDrop } from '@/features/file-upload'
import { DEFAULT_MODEL_ID, CHAT_PROVIDERS, DEFAULT_CHAT_PROVIDER, type ChatProvider } from '@/entities/ai-model'
import { useTranslations } from 'next-intl'
import { AnimatedHeadline } from './animated-headline'

const PRESET_PROMPTS = [
  { label: 'CRM system', text: 'Build a CRM system with contacts and sales pipeline', icon: Users },
  { label: 'E-commerce store', text: 'Create an e-commerce store with product catalog', icon: ShoppingCart },
  { label: 'ERP system', text: 'Build an ERP system with inventory and finance modules', icon: Package },
  { label: 'Task manager', text: 'Build a task management app with kanban board', icon: ListTodo },
  { label: 'Restaurant website', text: 'Create a restaurant website with menu and booking', icon: UtensilsCrossed },
]

export const PromptInput = () => {
  const t = useTranslations('widgets.dashboard')
  const searchParams = useSearchParams()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [prompt, setPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  // Chat-level AI provider chosen before the first generation. Sent to the
  // create API and mirrored into the store; defaults to Claude.
  const [provider, setProvider] = useState<ChatProvider>(DEFAULT_CHAT_PROVIDER)
  const [modelOpen, setModelOpen] = useState(false)
  const currentProviderName = CHAT_PROVIDERS.find(p => p.id === provider)?.name ?? 'Claude'

  const { uploadFile, uploadedFiles, removeFile, isUploading } = useFileUpload()
  const { isDragging, dragProps } = useFileDrop(async (files) => {
    for (let i = 0; i < files.length; i++) await uploadFile(files[i])
  })

  const router = useRouter()
  const setChatId = useChatStore(state => state.setChatId)
  const setProjectId = useChatStore(state => state.setProjectId)
  const setChatModel = useChatStore(state => state.setChatModel)
  const setPendingPrompt = useChatStore(state => state.setPendingPrompt)
  const addMessage = useChatStore(state => state.addMessage)
  const clearChat = useChatStore(state => state.clearChat)
  const pendingDraft = useChatStore(state => state.pendingDraft)
  const setPendingDraft = useChatStore(state => state.setPendingDraft)

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

  const createChatAndNavigate = async (
    content: string,
    images: string[],
    chatProvider: ChatProvider,
    generationModel: string = DEFAULT_MODEL_ID,
  ) => {
    setIsProcessing(true)

    try {
      clearChat()

      // 1. Create chat — `model` here is the chat-level AI provider
      //    (claude | openai | gemini), persisted on the chat by the backend.
      const { data: createData } = await api.post('/v1/ai-chat', {
        title: content.slice(0, 30) || t("newProject"),
        project_name: content.slice(0, 20) || t("newProject"),
        description: "",
        model: chatProvider,
        type: 'ugen'
      })

      const chatId = createData.data.id
      const projectId = createData.data.project_id

      setChatId(chatId)
      setProjectId(projectId)
      // Mirror the provider so the workspace chat-input selector reflects it
      // immediately on navigate (before fetchHistory syncs from the server).
      setChatModel(chatProvider)
      setPendingPrompt({
        content,
        images,
        // Per-message generation model — distinct from the chat provider above.
        model: generationModel
      })

      // 2. Navigate
      router.push(`/projects/${projectId}`)

    } catch (e) {
      console.error(e)
      setIsProcessing(false)
    }
  }

  const handleSubmit = async () => {
    if ((!prompt.trim() && uploadedFiles.length === 0) || isProcessing || isUploading) return
    await createChatAndNavigate(prompt, uploadedFiles.map(f => f.url), provider)
  }

  // Resume a draft typed on a public page before authentication (see
  // landing-hero-section). Runs once when this dashboard mounts post-login,
  // reproducing a normal prompt-input submit.
  useEffect(() => {
    if (!pendingDraft) return
    const draft = pendingDraft
    setPendingDraft(null)
    if (!draft.content.trim() && (draft.images?.length ?? 0) === 0) return
    setPrompt(draft.content)
    // The landing draft only carries a generation model, not a provider, so
    // create with the default provider (Claude) and the draft's generation model.
    createChatAndNavigate(draft.content, draft.images ?? [], DEFAULT_CHAT_PROVIDER, draft.model ?? DEFAULT_MODEL_ID)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  return (
    <div className="relative z-10 w-full max-w-3xl px-4 flex flex-col items-center gap-5">
      {/* Heading */}
      <div className="text-center">
        <AnimatedHeadline />
        <p className="text-text-muted text-base">
          {t('promptPlaceholderLong')}
        </p>
      </div>

      <div
        className="relative overflow-hidden w-full flex flex-col rounded-3xl border border-border-subtle bg-bg-card/80 backdrop-blur-xl p-2.5 shadow-2xl transition-all focus-within:border-primary/20 focus-within:ring-4 focus-within:ring-primary/5"
        {...dragProps}
      >
        <FileDropOverlay active={isDragging} />

        {/* File Previews */}
        <AttachmentPreviews files={uploadedFiles} onRemove={removeFile} className="px-3 pt-2" />

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

            <Popover open={modelOpen} onOpenChange={setModelOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={isProcessing}
                  className="flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors disabled:opacity-50"
                  title={t('aiProvider')}
                >
                  <Sparkles size={14} className="text-primary shrink-0" />
                  <span>{currentProviderName}</span>
                  <ChevronDown size={13} className="opacity-60" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" sideOffset={6} className="w-40 p-0.5">
                {CHAT_PROVIDERS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => { setProvider(p.id); setModelOpen(false) }}
                    className="text-text-main hover:bg-hover-bg flex w-full items-center justify-between gap-1.5 rounded px-2 py-1.5 text-left text-xs"
                  >
                    <span className="truncate">{p.name}</span>
                    {provider === p.id && <Check size={11} className="text-primary shrink-0" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
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
        {PRESET_PROMPTS.map(({ label, text, icon: Icon }) => (
          <button
            key={text}
            type="button"
            disabled={isProcessing}
            onClick={() => {
              setPrompt(text)
              textareaRef.current?.focus()
            }}
            title={text}
            className="flex items-center gap-1.5 border border-border-subtle rounded-full px-3 py-1.5 text-xs text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors disabled:opacity-50"
          >
            <Icon size={14} className="shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

