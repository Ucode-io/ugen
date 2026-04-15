import { Paperclip, MousePointerClick, ArrowUp, X, FileIcon, Loader2, Plus, Zap, Layers2, Sparkles, Check } from "lucide-react"
import { useState, useRef, KeyboardEvent, ClipboardEvent, DragEvent, useEffect } from "react"
import { AudioRecorder, Popover, PopoverContent, PopoverTrigger } from "@/shared/ui"
import { useFileUpload } from "@/shared/hooks/useFileUpload"
import { useVisualEditorStore } from "@/entities/visual-editor"
import { ModelSelector, DEFAULT_MODEL_ID } from "@/entities/ai-model"
import { cn } from "@/shared/lib/utils/cn"
import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { api } from "@/shared/api"
import type { CodeEditorTarget } from "@/entities/session"
import { useAuthStore } from "@/entities/session"
import { useCodeSelectionStore } from "@/entities/project/model/code-selection-store"

interface AttachItem {
  id: string
  name: string
  path?: string
  branch?: string
  type?: string
  project_id?: string
  repo_id?: string
}

export interface MessageContextItem {
  path?: string | null
  line?: number | string | null
  element?: string | null
}

export type MessageContext = MessageContextItem[]

interface ChatInputProps {
  onSendMessage: (msg: string, files?: any[], model?: string, context?: MessageContext) => void
  isSending?: boolean,
  disabled?: boolean,
  className?: string
  projectId?: string
  onSelectFunction?: (target: CodeEditorTarget) => void
  onSelectMicrofrontend?: (files: { path: string; content: string }[]) => void
}

export const ChatInput = ({ onSendMessage, isSending, disabled, className, projectId, onSelectFunction, onSelectMicrofrontend }: ChatInputProps) => {
  const t = useTranslations('widgets.workspaceChat')
  const { isInspectMode, selectedElements, setInspectMode, removeSelectedElement, clearSelectedElements } = useVisualEditorStore()
  const [value, setValue] = useState("")
  const [isPlanOn, setIsPlanOn] = useState(false)
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleTogglePlan = () => {
    setIsPlanOn(!isPlanOn)
  }

  const handleToggleVisualEdit = () => {
    setInspectMode(!isInspectMode)
  }

  const { uploadFile, uploadedFiles, removeFile, clearFiles, isUploading } = useFileUpload()

  const apiKey = useAuthStore((s) => s.apiKey)
  const activeCodeSelection = useCodeSelectionStore((s) => s.activeCodeSelection)
  const setActiveCodeSelection = useCodeSelectionStore((s) => s.setActiveCodeSelection)
  const getApiKeyHeaders = () => apiKey ? { Authorization: 'API-KEY', 'x-api-key': apiKey } : {}

  // Attach popover state
  const [attachOpen, setAttachOpen] = useState(false)
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)

  const { data: functionsList, isLoading: isFunctionsLoading, isError: isFunctionsError } = useQuery({
    queryKey: ['attach-functions', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v1/function', {
        params: { search: '', limit: 50, offset: 0, 'project-id': projectId },
        headers: getApiKeyHeaders(),
      })
      return (data.data?.functions ?? []) as AttachItem[]
    },
    enabled: attachOpen && !!projectId,
  })

  const { data: microfrontendsList, isLoading: isMicrofrontendsLoading, isError: isMicrofrontendsError } = useQuery({
    queryKey: ['attach-microfrontends', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v2/functions/micro-frontend', {
        params: { search: '', offset: 0, 'project-id': projectId },
        headers: getApiKeyHeaders(),
      })
      return (data.data?.functions ?? []) as AttachItem[]
    },
    enabled: attachOpen && !!projectId,
  })

  const handleSelectGeneratedFrontend = () => {
    setActiveCodeSelection({ kind: 'frontend' })
    onSelectMicrofrontend?.([])
    setAttachOpen(false)
  }

  const handleSelectFunction = async (fn: AttachItem) => {
    try {
      setPendingItemId(fn.id)
      await api.get(`/v2/function/${fn.id}/codebase`, { params: { 'project-id': projectId }, headers: getApiKeyHeaders() })
      setActiveCodeSelection({
        kind: 'function',
        id: fn.id,
        name: fn.name,
        path: fn.path,
        branch: fn.branch ?? 'master',
        type: fn.type,
        repoId: fn.repo_id,
      })
    } catch (err) {
      console.error('Failed to load function', err)
    } finally {
      setPendingItemId(null)
      setAttachOpen(false)
    }
  }

  const handleSelectMicrofrontend = async (mf: AttachItem) => {
    try {
      setPendingItemId(mf.id)
      const { data } = await api.get(`/v2/function/${mf.id}/codebase`, { params: { 'project-id': projectId }, headers: getApiKeyHeaders() })
      const files = (data?.data?.files ?? []) as { path: string; content: string }[]
      // Store files in the global store so preview can read them without forcing a tab switch
      setActiveCodeSelection({
        kind: 'microfrontend',
        id: mf.id,
        name: mf.name,
        path: mf.path,
        branch: mf.branch ?? 'master',
        type: mf.type,
        repoId: mf.project_id,
      }, files)
    } catch (err) {
      console.error('Failed to load microfrontend', err)
    } finally {
      setPendingItemId(null)
      setAttachOpen(false)
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [value])

  const handleSend = () => {
    if ((value.trim() || uploadedFiles.length > 0 || selectedElements.length > 0) && !isSending) {
      let messageText = value;
      let context: MessageContext | undefined;

      if (selectedElements.length > 0) {
        const elementsContext = selectedElements
          .map((el, i) => {
            const tag = el.tagName.toLowerCase();
            const attrs: string[] = [];
            if (el.htmlId) attrs.push(`id="${el.htmlId}"`);
            if (el.className) attrs.push(`class="${el.className}"`);
            if (el.dataName) attrs.push(`data-element-name="${el.dataName}"`);
            const attrStr = attrs.length ? ` ${attrs.join(" ")}` : "";
            const lines: string[] = [`Element ${i + 1}: <${tag}${attrStr}>`];
            if (el.domPath) lines.push(`  Path: ${el.domPath}`);
            if (el.textContent) lines.push(`  Text: "${el.textContent}"`);
            if (el.sourceFile) lines.push(`  Source: ${el.sourceFile}${el.sourceLine ? `:${el.sourceLine}` : ''}`);
            return lines.join("\n");
          })
          .join("\n\n");
        const header = selectedElements.length === 1
          ? "I selected the following element from the UI preview — please modify it:"
          : `I selected ${selectedElements.length} elements from the UI preview — please modify them:`;
        messageText = messageText
          ? `${messageText}\n\n${header}\n\n${elementsContext}`
          : `${header}\n\n${elementsContext}`;

        // Build context array from all selected elements that have source info
        const contextItems = selectedElements
          .filter(el => el.sourceFile)
          .map(el => {
            let element: string | undefined = el.outerHTML ?? undefined
            if (!element) {
              const tag = el.tagName.toLowerCase()
              const attrs: string[] = []
              if (el.htmlId) attrs.push(`id="${el.htmlId}"`)
              if (el.className) attrs.push(`class="${el.className}"`)
              if (el.dataName) attrs.push(`data-element-name="${el.dataName}"`)
              element = `<${tag}${attrs.length ? ' ' + attrs.join(' ') : ''}>`
            }
            return { path: el.sourceFile, line: el.sourceLine ?? undefined, element }
          })
        if (contextItems.length > 0) context = contextItems
      }

      onSendMessage(messageText, uploadedFiles, selectedModel, context);
      setValue("");
      clearFiles();
      clearSelectedElements();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      // If Command+Enter or Shift+Enter, allow new line
      if (e.metaKey || e.shiftKey) {
        return
      }

      // Otherwise, submit
      e.preventDefault()
      handleSend()
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
    <div
      className={cn(
        "relative overflow-hidden bg-bg-card border-border-subtle focus-within:ring-border-subtle flex w-full flex-col rounded-[20px] border p-2 shadow-sm transition-all focus-within:ring-1",
        className
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Visual Edit Selected Elements */}
      {selectedElements.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-2 mb-1 overflow-x-auto max-h-[60px]">
          {selectedElements.map((el) => (
            <div
              key={el.id}
              className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary px-2 py-1 rounded-md text-xs font-medium group"
            >
              <span className="opacity-70 font-mono text-[10px]">&lt;{el.tagName.toLowerCase()}&gt;</span>
              <span className="truncate max-w-25">{el.textContent || el.dataName || el.className || t('input.element')}</span>
              {el.sourceFile && (
                <span className="font-mono text-[10px] text-primary/60 truncate max-w-40">
                  {el.sourceFile}{el.sourceLine != null ? `:${el.sourceLine}` : ''}
                </span>
              )}
              <button
                onClick={() => removeSelectedElement(el.id)}
                className="hover:bg-primary/20 rounded-sm p-0.5"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* File Previews */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 pt-2">
          {uploadedFiles.map((file) => {
            const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(file.name);
            return (
              <div key={file.id} className="relative group bg-bg-main border border-border-subtle rounded-lg p-2 flex items-center gap-2 max-w-[200px]">
                {isImage ? (
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border-subtle">
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

      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        disabled={isSending || disabled}
        placeholder={t('input.placeholder')}
        className="text-text-main placeholder:text-text-muted w-full resize-none bg-transparent px-3 py-3 text-[15px] outline-none disabled:opacity-70"
        style={{ minHeight: "44px", maxHeight: "200px" }}
      />

      <div className="mt-2 flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            multiple
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="text-text-muted hover:bg-hover-bg hover:text-text-main flex h-7 w-7 items-center justify-center rounded-full transition-colors disabled:opacity-50"
            title={t('input.attachFile')}
          >
            {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
          </button>

          <Popover open={attachOpen} onOpenChange={setAttachOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-text-muted hover:bg-hover-bg hover:text-text-main flex h-7 w-7 items-center justify-center rounded-full transition-colors"
                title={t('input.attach', { fallback: 'Attach' })}
              >
                <Plus size={15} />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" sideOffset={6} className="p-0.5 w-48 max-h-60 overflow-y-auto">
              {(isFunctionsLoading || isMicrofrontendsLoading) ? (
                <div className="p-0.5 space-y-0.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-6 rounded bg-hover-bg/60 animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  {/* Generated Frontend */}
                  <div>
                    <div className="text-[9px] uppercase tracking-wider text-text-muted px-2 pt-1.5 pb-0.5 flex items-center gap-1">
                      <Sparkles size={8} /> Frontend
                    </div>
                    <button
                      type="button"
                      onClick={handleSelectGeneratedFrontend}
                      className="w-full flex items-center justify-between gap-1.5 rounded px-2 py-1 text-xs text-text-main hover:bg-hover-bg text-left"
                    >
                      <span className="flex items-center gap-1.5 truncate">
                        <Sparkles size={10} className="text-primary shrink-0" />
                        Generated Frontend
                      </span>
                      {activeCodeSelection?.kind === 'frontend' && (
                        <Check size={10} className="text-primary shrink-0" />
                      )}
                    </button>
                  </div>

                  {(functionsList?.length ?? 0) > 0 && (
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-text-muted px-2 pt-1.5 pb-0.5 flex items-center gap-1">
                        <Zap size={8} /> Functions
                      </div>
                      {functionsList!.map((fn) => (
                        <button
                          key={fn.id}
                          type="button"
                          disabled={pendingItemId === fn.id}
                          onClick={() => handleSelectFunction(fn)}
                          className="w-full flex items-center justify-between gap-1.5 rounded px-2 py-1 text-xs text-text-main hover:bg-hover-bg text-left disabled:opacity-60"
                        >
                          <span className="truncate">{fn.name}</span>
                          <span className="flex items-center gap-1 shrink-0">
                            {activeCodeSelection?.kind === 'function' && activeCodeSelection.id === fn.id && (
                              <Check size={10} className="text-primary" />
                            )}
                            {pendingItemId === fn.id && <Loader2 size={10} className="animate-spin" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {(microfrontendsList?.length ?? 0) > 0 && (
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-text-muted px-2 pt-1.5 pb-0.5 flex items-center gap-1">
                        <Layers2 size={8} /> Microfrontends
                      </div>
                      {microfrontendsList!.map((mf) => (
                        <button
                          key={mf.id}
                          type="button"
                          disabled={pendingItemId === mf.id}
                          onClick={() => handleSelectMicrofrontend(mf)}
                          className="w-full flex items-center justify-between gap-1.5 rounded px-2 py-1 text-xs text-text-main hover:bg-hover-bg text-left disabled:opacity-60"
                        >
                          <span className="truncate">{mf.name}</span>
                          <span className="flex items-center gap-1 shrink-0">
                            {activeCodeSelection?.kind === 'microfrontend' && activeCodeSelection.id === mf.id && (
                              <Check size={10} className="text-primary" />
                            )}
                            {pendingItemId === mf.id && <Loader2 size={10} className="animate-spin" />}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {(functionsList?.length ?? 0) === 0 && (microfrontendsList?.length ?? 0) === 0 && (
                    <div className="px-2 py-3 text-[11px] text-text-muted text-center">No items available</div>
                  )}

                  {(isFunctionsError || isMicrofrontendsError) && (
                    <div className="px-2 py-1.5 text-[11px] text-red-500">Failed to load items</div>
                  )}
                </>
              )}
            </PopoverContent>
          </Popover>

          <ModelSelector
            value={selectedModel}
            onValueChange={setSelectedModel}
            size="sm"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            className={
              `
              border-border-subtle text-text-muted hover:bg-hover-bg 
              hover:text-text-main flex h-7 items-center justify-center 
              gap-1.5 rounded-full border px-2 text-xs font-medium transition-colors
              ${isInspectMode ? "bg-text-main text-bg-main" : ""}
              `
            }
            onClick={handleToggleVisualEdit}
          >
            <MousePointerClick size={13} />
            {/* <span>{t('input.visualEdits')}</span> */}
          </button>
          {/* <button
            className={
              `
              text-text-muted hover:bg-hover-bg hover:text-text-main 
              flex h-8 items-center justify-center rounded-full px-3 
              text-xs font-medium transition-colors
              ${isPlanOn ? "bg-text-main text-bg-main" : ""}
              `
            }
            onClick={handleTogglePlan}
          >
            {t('input.plan')}
          </button>
          <AudioRecorder
            onTranscription={(text) => {
              setValue(prev => prev + (prev ? " " : "") + text);
              if (textareaRef.current) {
                textareaRef.current.focus();
              }
            }}
            size="sm"
          /> */}
          <button
            onClick={handleSend}
            disabled={(!value.trim() && uploadedFiles.length === 0 && selectedElements.length === 0) || isUploading || isSending}
            className="bg-text-main text-bg-main ml-1 flex h-7 w-7 items-center justify-center rounded-full transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            title={t('input.send')}
          >
            {isSending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ArrowUp size={14} strokeWidth={2.5} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

