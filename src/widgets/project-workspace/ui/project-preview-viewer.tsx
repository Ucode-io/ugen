import { useState, useEffect, useRef } from "react"
import { useVisualEditorStore } from "@/entities/visual-editor"
import { MoveablePrompt } from "./moveable-prompt"
import { useFilesStore } from "@/entities/project/model/files-store"
import { buildProjectFromFiles, ensureEsbuild } from "../lib/bundler"
import { generatePreviewHtml } from "../lib/preview-html"
import { Loader2 } from "lucide-react"

export const ProjectPreviewViewer = () => {
  const { isInspectMode, addSelectedElement } = useVisualEditorStore()
  const { files } = useFilesStore()
  const [srcDoc, setSrcDoc] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Floating Prompt States
  const [isPromptVisible, setIsPromptVisible] = useState(false)
  const [promptPosition, setPromptPosition] = useState({ x: 0, y: 0 })

  const runCode = async () => {
    setIsLoading(true);
    try {
      await ensureEsbuild();
      const { code, dependencies } = await buildProjectFromFiles(files, { NODE_ENV: 'development' });
      const html = generatePreviewHtml(code, dependencies);

      setSrcDoc(html);
    } catch (err: any) {
      console.error("Build failed:", err);
      setSrcDoc(
        `<html><body><pre style="color:red; padding:2rem; font-family:monospace;">${err.message}</pre></body></html>`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      runCode();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [files]);

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: isInspectMode ? 'INSPECT_ON' : 'INSPECT_OFF' }, "*");
    }
  }, [isInspectMode, srcDoc]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'INSPECT_SELECT') {
        const { tag, className, rect } = e.data

        addSelectedElement({
          id: Math.random().toString(36).substr(2, 9),
          tagName: tag.toUpperCase(),
          className: className ? className.split(' ').slice(0, 3).join(' ') : '',
          text: '' // text extraction could be added if needed
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


  return (
    <div
      ref={containerRef}
      className={`flex-1 flex flex-col bg-white text-slate-900 h-full relative ${isInspectMode ? 'cursor-crosshair' : ''}`}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-slate-500">
            <Loader2 className="animate-spin" size={32} />
            <p className="font-medium animate-pulse">Building project preview...</p>
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

      <iframe
        ref={iframeRef}
        className="w-full h-full border-none flex-1"
        srcDoc={srcDoc}
        title="Project Preview"
        sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
      />
    </div>
  )
}
