import { useState, useEffect, useRef, useMemo } from "react"
import { useVisualEditorStore } from "@/entities/visual-editor"
import { MoveablePrompt } from "./moveable-prompt"
import { useFilesStore } from "@/entities/project/model/files-store"
import { useChatStore } from "@/entities/chat"
import { buildProjectFromFiles, ensureEsbuild } from "../lib/bundler"
import { generatePreviewHtml } from "../lib/preview-html"
import { AlertTriangle, Loader2, Sparkles } from "lucide-react"
import type { DeviceType } from "./project-header"

interface PreviewRuntimeError {
  message: string
  stack?: string | null
  filename?: string | null
  lineno?: number | null
  colno?: number | null
}

const DEVICE_WIDTHS: Record<DeviceType, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
}

interface ProjectPreviewViewerProps {
  device?: DeviceType
  isMaximized?: boolean
  microfrontendFiles?: { path: string; content: string }[] | null
}

const getLanguageByPath = (path: string) => {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'js':
    case 'jsx': return 'javascript'
    case 'ts':
    case 'tsx': return 'typescript'
    case 'json': return 'json'
    case 'css': return 'css'
    case 'html': return 'html'
    default: return 'javascript'
  }
}

export const ProjectPreviewViewer = ({ device = 'desktop', isMaximized = false, microfrontendFiles }: ProjectPreviewViewerProps) => {
  const { isInspectMode, addSelectedElement } = useVisualEditorStore()
  const { files: storeFiles } = useFilesStore()
  const files = useMemo(
    () => microfrontendFiles && microfrontendFiles.length > 0
      ? microfrontendFiles.map(f => ({ path: f.path, content: f.content, language: getLanguageByPath(f.path) }))
      : storeFiles,
    [microfrontendFiles, storeFiles]
  )
  const setPendingPrompt = useChatStore((s) => s.setPendingPrompt)
  const [srcDoc, setSrcDoc] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [runtimeError, setRuntimeError] = useState<PreviewRuntimeError | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const isBuilding = useRef(false);

  // Floating Prompt States
  const [isPromptVisible, setIsPromptVisible] = useState(false)
  const [promptPosition, setPromptPosition] = useState({ x: 0, y: 0 })

  const runCode = async () => {
    if (isBuilding.current) return;
    isBuilding.current = true;
    setIsLoading(true);
    setRuntimeError(null);
    try {
      await ensureEsbuild();
      console.log("[Preview] esbuild ready, building project...");
      const { code, dependencies } = await buildProjectFromFiles(files,
        {
          VITE_API_BASE_URL: "http://localhost:3000",
          VITE_API_KEY: "",
          VITE_X_API_KEY: "",
          VITE_MAP_TILE_URL: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          VITE_APP_NAME: "App",
          NODE_ENV: 'development'
        }
      );
      console.log("[Preview] Build successful, code length:", code.length);
      console.log("[Preview] Dependencies:", Object.keys(dependencies));
      const html = generatePreviewHtml(code, dependencies, files);
      console.log("[Preview] HTML generated, length:", html.length);

      setSrcDoc(html);
    } catch (err: any) {
      console.warn("[Preview] Build failed:", err.message || err);
      // Wait, isBuilding is ref, it won't trigger re-render, so just set srcDoc
      setSrcDoc(
        `<html><body style="background:#1e1e1e;color:#f87171;padding:2rem;font-family:monospace;white-space:pre-wrap;">${err.message || 'Unknown build error'}</body></html>`
      );
    } finally {
      setIsLoading(false);
      isBuilding.current = false;
    }
  };

  // Stable hash of files to avoid infinite re-render loops
  const filesHash = useMemo(() => {
    return files.map(f => f.path + ':' + f.content?.length).join('|');
  }, [files]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      runCode();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [filesHash]);

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: isInspectMode ? 'INSPECT_ON' : 'INSPECT_OFF' }, "*");
    }
  }, [isInspectMode, srcDoc]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'PREVIEW_RUNTIME_ERROR') {
        setRuntimeError({
          message: e.data.message,
          stack: e.data.stack,
          filename: e.data.filename,
          lineno: e.data.lineno,
          colno: e.data.colno,
        })
        return
      }

      if (e.data?.type === 'INSPECT_SELECT') {
        const { tag, id, className, name, domPath, textContent, rect } = e.data

        addSelectedElement({
          id: Math.random().toString(36).substr(2, 9),
          tagName: tag.toUpperCase(),
          className: className ? className.split(' ').slice(0, 3).join(' ') : '',
          htmlId: id || undefined,
          dataName: name || undefined,
          domPath: domPath || undefined,
          textContent: textContent || undefined,
        })

        if (rect && containerRef.current) {
          setIsPromptVisible(true)
          setPromptPosition({
            x: Math.max(20, rect.left + (rect.width / 2) - 300), // centered (assuming 600px width max)
            y: Math.max(20, rect.top + rect.height + 20)
          })
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addSelectedElement]);


  const handleFixInChat = () => {
    if (!runtimeError) return
    const location = runtimeError.filename
      ? `\nFile: ${runtimeError.filename}${runtimeError.lineno ? `:${runtimeError.lineno}${runtimeError.colno ? `:${runtimeError.colno}` : ''}` : ''}`
      : ''
    const stack = runtimeError.stack ? `\n\nStack:\n${runtimeError.stack}` : ''
    const content = `Исправь ошибку в превью проекта.\n\nОшибка: ${runtimeError.message}${location}${stack}`
    setPendingPrompt({ content })
    setRuntimeError(null)
  }

  const iframeWidth = DEVICE_WIDTHS[device]

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex flex-col bg-bg-main h-full relative overflow-hidden ${isInspectMode ? 'cursor-crosshair' : ''}`}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-slate-500">
            <Loader2 className="animate-spin" size={32} />
            <p className="font-medium animate-pulse">Building project preview...</p>
          </div>
        </div>
      )}

      {runtimeError && !isLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-bg-main/95 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-lg w-full bg-bg-card border border-border-subtle rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-start gap-3 p-5 border-b border-border-subtle">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-text-main">Ошибка в превью</h3>
                <p className="text-xs text-text-muted mt-0.5">Произошла ошибка во время выполнения кода</p>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-bg-sidebar/60 border border-border-subtle/60 rounded-lg p-3 max-h-40 overflow-auto">
                <pre className="text-xs text-red-500 font-mono whitespace-pre-wrap break-words">
                  {runtimeError.message}
                </pre>
                {runtimeError.filename && (
                  <p className="text-[11px] text-text-muted mt-2 font-mono break-all">
                    {runtimeError.filename}
                    {runtimeError.lineno ? `:${runtimeError.lineno}` : ''}
                    {runtimeError.colno ? `:${runtimeError.colno}` : ''}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRuntimeError(null)}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors rounded-lg"
                >
                  Закрыть
                </button>
                <button
                  type="button"
                  onClick={handleFixInChat}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 active:bg-primary/80 transition-colors rounded-lg shadow-sm"
                >
                  <Sparkles className="w-4 h-4" />
                  Исправить в чате
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Prompt Bar */}
      <MoveablePrompt
        isVisible={isPromptVisible && isInspectMode}
        initialPosition={promptPosition}
        containerRef={containerRef}
        onClose={() => setIsPromptVisible(false)}
      />

      <div className={`flex-1 flex justify-center items-start h-full overflow-auto transition-all duration-300 ${isMaximized ? 'p-0' : 'py-4 px-4'}`}>
        <div
          className="bg-white border border-border-subtle shadow-md transition-all duration-300 overflow-hidden flex-shrink-0"
          style={{
            width: iframeWidth,
            maxWidth: '100%',
            height: '100%',
            borderRadius: isMaximized ? '0px' : device === 'desktop' ? '12px' : '24px',
          }}
        >
          <iframe
            ref={iframeRef}
            className="w-full h-full border-none"
            srcDoc={srcDoc}
            title="Project Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          />
        </div>
      </div>
    </div>
  )
}
