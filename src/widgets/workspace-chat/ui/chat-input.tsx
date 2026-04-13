import { Paperclip, MousePointerClick, ArrowUp, X, FileIcon, Loader2 } from "lucide-react"
import { useState, useRef, KeyboardEvent, ClipboardEvent, DragEvent, useEffect } from "react"
import { AudioRecorder } from "@/shared/ui"
import { useFileUpload } from "@/shared/hooks/useFileUpload"
import { useVisualEditorStore } from "@/entities/visual-editor"
import { ModelSelector, DEFAULT_MODEL_ID } from "@/entities/ai-model"
import { cn } from "@/shared/lib/utils/cn"
import { useTranslations } from "next-intl"

interface ChatInputProps {
  onSendMessage: (msg: string, files?: any[], model?: string) => void
  isSending?: boolean,
  disabled?: boolean,
  className?: string
}

export const ChatInput = ({ onSendMessage, isSending, disabled, className }: ChatInputProps) => {
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
            return lines.join("\n");
          })
          .join("\n\n");
        const header = selectedElements.length === 1
          ? "I selected the following element from the UI preview — please modify it:"
          : `I selected ${selectedElements.length} elements from the UI preview — please modify them:`;
        messageText = messageText
          ? `${messageText}\n\n${header}\n\n${elementsContext}`
          : `${header}\n\n${elementsContext}`;
      }
      onSendMessage(messageText, uploadedFiles, selectedModel);
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
              <span className="truncate max-w-[120px]">{el.textContent || el.dataName || el.className || t('input.element')}</span>
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

