import { useState, useEffect, useRef, useMemo } from "react"
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

  const isBuilding = useRef(false);

  // Floating Prompt States
  const [isPromptVisible, setIsPromptVisible] = useState(false)
  const [promptPosition, setPromptPosition] = useState({ x: 0, y: 0 })

  const runCode = async () => {
    if (isBuilding.current) return;
    isBuilding.current = true;
    setIsLoading(true);
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
