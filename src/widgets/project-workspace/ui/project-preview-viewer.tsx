import { useState, useEffect, useRef, useMemo } from "react"
import { useVisualEditorStore } from "@/entities/visual-editor"
import { MoveablePrompt } from "./moveable-prompt"
import { useFilesStore } from "@/entities/project/model/files-store"
import { useChatStore } from "@/entities/chat"
import { buildProjectFromFiles, ensureEsbuild } from "../lib/bundler"
import { generatePreviewHtml } from "../lib/preview-html"
import {
  AlertTriangle, Loader2, Sparkles, Layers2, Zap,
  MousePointerClick, Monitor, Tablet, Smartphone,
  ChevronDown, Minimize, Maximize, Check,
  Palette, Upload, ChevronUp, Search,
} from "lucide-react"

const FONT_FAMILIES = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway',
  'Ubuntu', 'Nunito', 'Playfair Display', 'Merriweather', 'Source Code Pro',
  'Fira Code', 'DM Sans', 'Space Grotesk', 'Plus Jakarta Sans', 'Manrope',
  'Outfit', 'Geist', 'Geist Mono', 'Josefin Sans', 'Rubik', 'Work Sans',
  'Karla', 'Mulish', 'Jost', 'Cabin', 'Quicksand', 'Barlow', 'Archivo',
  'Figtree', 'Lexend', 'Noto Sans', 'PT Sans', 'Source Sans 3', 'IBM Plex Sans',
  'IBM Plex Mono', 'Inconsolata', 'DM Mono', 'Pacifico', 'Dancing Script',
  'Bebas Neue', 'Anton', 'Oswald', 'Crimson Text', 'EB Garamond',
  'Libre Baskerville', 'Cormorant Garamond', 'Cinzel', 'Spectral',
]

// Shadcn CSS stores HSL as "H S% L%" (space-separated, no hsl() wrapper)
function hslStringToHex(hsl: string): string {
  const [hStr, sStr, lStr] = hsl.trim().split(/\s+/)
  const h = parseFloat(hStr)
  const s = parseFloat(sStr) / 100
  const l = parseFloat(lStr) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60)       { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else              { r = c; g = 0; b = x }
  const hex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

function hexToHslString(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

function parseCssTheme(css: string) {
  const readVar = (name: string) => css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim() ?? null
  const fontBodyRaw = css.match(/--font-body:\s*['"]?([^'",;\n]+)/)?.[1].trim().replace(/^['"]|['"]$/g, '') ?? 'Inter'
  return {
    background: readVar('background') ? hslStringToHex(readVar('background')!) : '#F6F7F9',
    primary:    readVar('primary')    ? hslStringToHex(readVar('primary')!)    : '#493CDD',
    foreground: readVar('foreground') ? hslStringToHex(readVar('foreground')!) : '#151A28',
    fontFamily: fontBodyRaw,
  }
}

function applyThemeToCss(css: string, colors: { background: string; primary: string; foreground: string }, font: string): string {
  let result = css

  const replaceVar = (name: string, hslStr: string) => {
    result = result.replace(
      new RegExp(`(--${name}:\\s*)[\\d.]+\\s+[\\d.]+%\\s+[\\d.]+%`),
      `$1${hslStr}`
    )
  }
  replaceVar('background', hexToHslString(colors.background))
  replaceVar('primary',    hexToHslString(colors.primary))
  replaceVar('foreground', hexToHslString(colors.foreground))

  // Update font-body variable and its Google Fonts import
  const currentFont = css.match(/--font-body:\s*['"]?([^'",;\n]+)/)?.[1].trim().replace(/^['"]|['"]$/g, '')
  if (currentFont && currentFont !== font) {
    result = result.replace(/--font-body:\s*[^;]+;/, `--font-body: '${font}', sans-serif;`)
    const encodedCurrent = currentFont.replace(/\s+/g, '+')
    const encodedNew = font.replace(/\s+/g, '+')
    result = result.replace(
      new RegExp(`@import url\\(['"]https://fonts\\.googleapis\\.com/css2\\?family=${encodedCurrent}[^'"]*['"]\\);`),
      `@import url('https://fonts.googleapis.com/css2?family=${encodedNew}:wght@300;400;500;600;700&display=swap');`
    )
  }

  return result
}
import type { DeviceType } from "./project-header"
import { useAuthStore } from "@/entities/session"
import { useCodeSelectionStore } from "@/entities/project/model/code-selection-store"
import type { CodeSelectionFile } from "@/entities/project/model/code-selection-store"
import { api } from "@/shared/api"
import { useQuery } from "@tanstack/react-query"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui"
import { cn } from "@/shared/lib/utils/cn"
import { WorkspaceLoader } from "./workspace-loader"

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

const DEVICES: { id: DeviceType; label: string; icon: React.ReactNode }[] = [
  { id: 'desktop', label: 'Desktop', icon: <Monitor size={14} /> },
  { id: 'tablet',  label: 'Tablet',  icon: <Tablet size={14} /> },
  { id: 'mobile',  label: 'Mobile',  icon: <Smartphone size={14} /> },
]

interface ProjectPreviewViewerProps {
  device?: DeviceType
  isMaximized?: boolean
  isChatCollapsed?: boolean
  chatPosition?: 'left' | 'right'
  versionPreviewFiles?: { path: string; content: string }[] | null
  projectId?: string
  onDeviceChange?: (device: DeviceType) => void
  onToggleMaximize?: () => void
  isVersionHistory?: boolean
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

export const ProjectPreviewViewer = ({
  device = 'desktop',
  isMaximized = false,
  versionPreviewFiles,
  projectId,
  onDeviceChange,
  onToggleMaximize,
  isChatCollapsed,
  chatPosition = 'left',
  isVersionHistory = false,
}: ProjectPreviewViewerProps) => {
  const { isInspectMode, addSelectedElement, setInspectMode } = useVisualEditorStore()
  const { files: storeFiles, updateFile } = useFilesStore()
  const activeCodeSelection = useCodeSelectionStore((s) => s.activeCodeSelection)
  const activeCodeFiles = useCodeSelectionStore((s) => s.activeCodeFiles)
  const setActiveCodeSelection = useCodeSelectionStore((s) => s.setActiveCodeSelection)
  const apiKey = useAuthStore((s) => s.apiKey)

  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null)

  const isFunction = activeCodeSelection?.kind === 'function'

  const { data: microfrontendsList = [] } = useQuery({
    queryKey: ['preview-microfrontends', projectId],
    queryFn: async () => {
      const headers = apiKey ? { Authorization: 'API-KEY', 'x-api-key': apiKey } : {}
      const { data } = await api.get('/v2/functions/micro-frontend', {
        params: { search: '', offset: 0, limit: 50, 'project-id': projectId },
        headers,
      })
      return (data.data?.functions ?? []) as Array<{ id: string; name: string; path?: string; branch?: string; type?: string; project_id?: string; url?: string }>
    },
    enabled: !!projectId,
    staleTime: 0,
  })

  // Files priority for the preview iframe:
  // 1. versionPreviewFiles (browsing version history)
  // 2. If a microfrontend is selected → its activeCodeFiles only — never fall back to
  //    storeFiles, otherwise we'd build the wrong code in the gap before MF codebase loads.
  // 3. Otherwise (frontend / no selection) → storeFiles
  const isMicrofrontend = activeCodeSelection?.kind === 'microfrontend'
  const isMicrofrontendLoading = isMicrofrontend && (!activeCodeFiles || activeCodeFiles.length === 0)
  const files = useMemo(() => {
    if (versionPreviewFiles && versionPreviewFiles.length > 0) {
      return versionPreviewFiles.map((f) => ({ path: f.path, content: f.content, language: getLanguageByPath(f.path) }))
    }
    if (isMicrofrontend) {
      return (activeCodeFiles ?? []).map((f: CodeSelectionFile) => ({ path: f.path, content: f.content, language: getLanguageByPath(f.path) }))
    }
    return storeFiles
  }, [versionPreviewFiles, isMicrofrontend, activeCodeFiles, storeFiles])

  const handlePickMicrofrontend = async (mf: { id: string; name: string; path?: string; branch?: string; type?: string; project_id?: string; repo_id?: string; url?: string }) => {
    try {
      setLoadingPreviewId(mf.id)
      const headers = apiKey ? { Authorization: 'API-KEY', 'x-api-key': apiKey } : {}
      const { data } = await api.get(`/v2/function/${mf.id}/codebase`, {
        params: { 'project-id': projectId },
        headers,
      })
      const fetched = (data?.data?.files ?? []) as CodeSelectionFile[]
      setActiveCodeSelection({ kind: 'microfrontend', id: mf.id, name: mf.name, path: mf.path, branch: mf.branch ?? 'master', type: mf.type, repoId: mf.repo_id, url: mf.url, projectId: mf.project_id }, fetched)
    } catch (err) {
      console.error('Failed to load microfrontend for preview', err)
    } finally {
      setLoadingPreviewId(null)
    }
  }

  const handlePickGeneratedFrontend = () => {
    setActiveCodeSelection({ kind: 'frontend' })
  }

  const setPendingPrompt = useChatStore((s) => s.setPendingPrompt)
  const [srcDoc, setSrcDoc] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [runtimeError, setRuntimeError] = useState<PreviewRuntimeError & { isBuildError?: boolean } | null>(null)

  // URL bar state
  const [currentUrl, setCurrentUrl] = useState('/')
  const [urlInput, setUrlInput] = useState('/')
  const [deviceOpen, setDeviceOpen] = useState(false)
  const [microfrontendOpen, setMicrofrontendOpen] = useState(false)

  // Theme popover state
  const [themeOpen, setThemeOpen] = useState(false)
  const [themeSettings, setThemeSettings] = useState({
    background: '#F6F7F9',
    primary: '#493CDD',
    foreground: '#151A28',
    logoUrl: '',
  })
  const [fontFamily, setFontFamily] = useState('Inter')
  const [fontSearch, setFontSearch] = useState('')
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  // Snapshot of theme at the moment the popover opens — used to restore on Cancel
  const themeSnapshotRef = useRef({ ...{ background: '#F6F7F9', primary: '#493CDD', foreground: '#151A28', logoUrl: '' }, fontFamily: 'Inter' })

  const filteredFonts = FONT_FAMILIES.filter((f) =>
    f.toLowerCase().includes(fontSearch.toLowerCase())
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const isBuilding = useRef(false)

  // Keep a ref to files so message handler always sees the latest value
  const filesRef = useRef(files)
  useEffect(() => { filesRef.current = files }, [files])

  // Sync theme state from src/index.css — skip while the popover is open so user edits are not overwritten
  useEffect(() => {
    if (themeOpen) return
    const cssFile = files.find((f) => f.path === 'src/index.css')
    if (!cssFile?.content) return
    const parsed = parseCssTheme(cssFile.content)
    setThemeSettings((prev) => ({ ...prev, background: parsed.background, primary: parsed.primary, foreground: parsed.foreground }))
    setFontFamily(parsed.fontFamily)
  }, [files, themeOpen])

  // Live preview: inject CSS overrides directly into the iframe whenever colors/font change while popover is open
  useEffect(() => {
    if (!themeOpen) return
    const doc = iframeRef.current?.contentDocument
    if (!doc?.head) return

    let styleEl = doc.getElementById('ugen-theme-override') as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = doc.createElement('style')
      styleEl.id = 'ugen-theme-override'
      doc.head.appendChild(styleEl)
    }
    styleEl.textContent = `:root {
      --background: ${hexToHslString(themeSettings.background)};
      --foreground: ${hexToHslString(themeSettings.foreground)};
      --primary: ${hexToHslString(themeSettings.primary)};
      --font-body: '${fontFamily}', sans-serif;
    }
    body { font-family: '${fontFamily}', sans-serif; }`

    let linkEl = doc.getElementById('ugen-font-override') as HTMLLinkElement | null
    if (!linkEl) {
      linkEl = doc.createElement('link')
      linkEl.id = 'ugen-font-override'
      linkEl.rel = 'stylesheet'
      doc.head.appendChild(linkEl)
    }
    linkEl.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@300;400;500;600;700&display=swap`
  }, [themeSettings, fontFamily, themeOpen, srcDoc])

  const handleThemeOpenChange = (open: boolean) => {
    if (open) {
      // Snapshot current state so Cancel can restore it
      themeSnapshotRef.current = { ...themeSettings, fontFamily }
    }
    setThemeOpen(open)
  }

  const handleCancelTheme = () => {
    const snap = themeSnapshotRef.current
    setThemeSettings((prev) => ({ ...prev, background: snap.background, primary: snap.primary, foreground: snap.foreground, logoUrl: snap.logoUrl }))
    setFontFamily(snap.fontFamily)
    setThemeOpen(false)
  }

  const handleSaveTheme = () => {
    const cssFile = files.find((f) => f.path === 'src/index.css')
    if (!cssFile) { setThemeOpen(false); return }
    const newContent = applyThemeToCss(cssFile.content, themeSettings, fontFamily)
    if (isMicrofrontend && activeCodeSelection && activeCodeFiles) {
      setActiveCodeSelection(
        activeCodeSelection,
        activeCodeFiles.map((f) => f.path === 'src/index.css' ? { ...f, content: newContent } : f)
      )
    } else {
      updateFile('src/index.css', newContent)
    }
    setThemeOpen(false)
  }

  // Floating Prompt States
  const [isPromptVisible, setIsPromptVisible] = useState(false)
  const [promptPosition, setPromptPosition] = useState({ x: 0, y: 0 })

  const runCode = async () => {
    if (isBuilding.current) return
    isBuilding.current = true
    setIsLoading(true)
    setRuntimeError(null)
    try {
      await ensureEsbuild()
      const { code, dependencies } = await buildProjectFromFiles(files, {
        VITE_API_BASE_URL: "http://localhost:3000",
        VITE_API_KEY: "",
        VITE_X_API_KEY: "",
        VITE_MAP_TILE_URL: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        VITE_APP_NAME: "App",
        NODE_ENV: 'development'
      })
      const html = generatePreviewHtml(code, dependencies, files)
      setSrcDoc(html)
    } catch (err: any) {
      const errorMessage = err.message || 'Unknown build error'
      setSrcDoc(
        `<html><body style="background:#1e1e1e;color:#f87171;padding:2rem;font-family:monospace;white-space:pre-wrap;">${errorMessage}</body></html>`
      )
      setRuntimeError({ message: errorMessage, stack: err.stack ?? null, isBuildError: true })
    } finally {
      setIsLoading(false)
      isBuilding.current = false
    }
  }

  const handleRefresh = () => {
    isBuilding.current = false
    setCurrentUrl('/')
    setUrlInput('/')
    runCode()
  }

  const handleUrlNavigate = () => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'NAVIGATE', url: urlInput }, '*')
    setCurrentUrl(urlInput)
  }

  const filesHash = useMemo(() => {
    return files.map(f => f.path + ':' + f.content?.length).join('|')
  }, [files])

  useEffect(() => {
    // Don't build with empty/wrong files while a microfrontend's codebase is still loading.
    if (isMicrofrontendLoading) return
    const timeout = setTimeout(() => { runCode() }, 1000)
    return () => clearTimeout(timeout)
  }, [filesHash, isMicrofrontendLoading])

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: isInspectMode ? 'INSPECT_ON' : 'INSPECT_OFF' }, "*")
    }
  }, [isInspectMode, srcDoc])

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'ROUTE_CHANGE') {
        const url = e.data.url || '/'
        setCurrentUrl(url)
        setUrlInput(url)
        return
      }

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
        const { tag, id, className, name, domPath, textContent, rect, componentName, outerHTML } = e.data

        // Find the component definition in source files by component name
        let sourceFile: string | null = null
        let sourceLine: number | null = null
        if (componentName) {
          const patterns = [
            new RegExp(`(export\\s+)?(default\\s+)?function\\s+${componentName}\\b`),
            new RegExp(`(export\\s+)?const\\s+${componentName}\\s*[=:]`),
            new RegExp(`(export\\s+)?class\\s+${componentName}\\b`),
          ]
          outer: for (const file of filesRef.current) {
            if (!file.content) continue
            const lines = file.content.split('\n')
            for (let i = 0; i < lines.length; i++) {
              if (patterns.some(p => p.test(lines[i]))) {
                sourceFile = file.path
                sourceLine = i + 1
                break outer
              }
            }
          }
        }

        addSelectedElement({
          id: Math.random().toString(36).substr(2, 9),
          tagName: tag.toUpperCase(),
          className: className ? className.split(' ').slice(0, 3).join(' ') : '',
          htmlId: id || undefined,
          dataName: name || undefined,
          domPath: domPath || undefined,
          textContent: textContent || undefined,
          sourceFile,
          sourceLine,
          outerHTML: outerHTML || null,
        })
        if (rect && containerRef.current) {
          setIsPromptVisible(true)
          setPromptPosition({
            x: Math.max(20, rect.left + (rect.width / 2) - 300),
            y: Math.max(20, rect.top + rect.height + 20)
          })
        }
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [addSelectedElement])

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
  const selectedDevice = DEVICES.find((d) => d.id === device) ?? DEVICES[0]

  // Shared browser header JSX (rendered inside the card)
  const browserHeader = (
    <div className="h-10 shrink-0 flex items-center justify-between px-2 border-b border-border-subtle bg-bg-card gap-2">
      {/* Left: Logo (fullscreen only) + Visual Edit */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isMaximized && (
          <>
            <img src="/ugen-logo.svg" className="h-5 w-auto block dark:hidden" alt="ugen" />
            <img src="/ugen-logo-dark.svg" className="h-5 w-auto hidden dark:block" alt="ugen" />
            <div className="w-px h-4 bg-border-subtle mx-0.5" />
          </>
        )}
        {!isVersionHistory && (
          <button
            type="button"
            onClick={() => setInspectMode(!isInspectMode)}
            title="Visual Edit"
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
              isInspectMode
                ? "bg-text-main text-bg-main"
                : "text-text-muted hover:bg-hover-bg hover:text-text-main"
            )}
          >
            <MousePointerClick size={13} />
          </button>
        )}
        {!isVersionHistory && (
          <Popover open={themeOpen} onOpenChange={handleThemeOpenChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="Theme"
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-md transition-colors",
                  themeOpen
                    ? "bg-text-main text-bg-main"
                    : "text-text-muted hover:bg-hover-bg hover:text-text-main"
                )}
              >
                <Palette size={13} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={8} className="w-72 p-0">
              {/* Header */}
              <div className="px-4 pt-4 pb-3 border-b border-border-subtle">
                <h3 className="text-sm font-semibold text-text-main">Theme</h3>
                <p className="text-[11px] text-text-muted mt-0.5">Colors and fonts for your project.</p>
              </div>

              <div className="px-4 py-3 space-y-4">
                {/* Colors */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Colors</p>
                  {(
                    [
                      { key: 'background', label: 'Background' },
                      { key: 'primary',    label: 'Primary' },
                      { key: 'foreground', label: 'Foreground' },
                    ] as const
                  ).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-[13px] text-text-main">{label}</span>
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <span className="text-[12px] text-text-muted font-mono group-hover:text-text-main transition-colors">
                          {themeSettings[key].toUpperCase()}
                        </span>
                        <div
                          className="w-6 h-6 rounded border border-border-subtle shadow-sm overflow-hidden relative"
                          style={{ backgroundColor: themeSettings[key] }}
                        >
                          <input
                            type="color"
                            value={themeSettings[key]}
                            onChange={(e) => setThemeSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Logo</p>
                  <div className="flex items-center gap-2">
                    {themeSettings.logoUrl ? (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <img src={themeSettings.logoUrl} alt="Logo" className="h-7 w-auto max-w-20 object-contain rounded border border-border-subtle" />
                        <button
                          type="button"
                          onClick={() => setThemeSettings((prev) => ({ ...prev, logoUrl: '' }))}
                          className="text-[11px] text-text-muted hover:text-red-500 transition-colors ml-auto shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-dashed border-border-subtle hover:border-primary/50 hover:bg-primary/5 text-text-muted hover:text-primary transition-colors text-[12px] w-full justify-center"
                      >
                        <Upload size={12} />
                        Upload logo
                      </button>
                    )}
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = (ev) => setThemeSettings((prev) => ({ ...prev, logoUrl: ev.target?.result as string }))
                        reader.readAsDataURL(file)
                        e.target.value = ''
                      }}
                    />
                  </div>
                </div>

                {/* Font Family */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Font Family</p>
                  <button
                    type="button"
                    onClick={() => { setFontDropdownOpen((o) => !o); setFontSearch('') }}
                    className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-sidebar text-[13px] text-text-main hover:border-primary/40 hover:bg-primary/5 transition-colors"
                  >
                    <span>{fontFamily}</span>
                    {fontDropdownOpen ? <ChevronUp size={12} className="text-text-muted" /> : <ChevronDown size={12} className="text-text-muted" />}
                  </button>
                  {fontDropdownOpen && (
                    <div className="border border-border-subtle rounded-lg overflow-hidden">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-border-subtle bg-bg-sidebar">
                        <Search size={11} className="text-text-muted shrink-0" />
                        <input
                          autoFocus
                          type="text"
                          value={fontSearch}
                          onChange={(e) => setFontSearch(e.target.value)}
                          placeholder="Search fonts..."
                          className="flex-1 bg-transparent text-[12px] text-text-main placeholder:text-text-muted outline-none"
                        />
                      </div>
                      <div className="max-h-36 overflow-y-auto">
                        {filteredFonts.length === 0 ? (
                          <p className="px-3 py-2 text-[12px] text-text-muted">No fonts found</p>
                        ) : filteredFonts.map((f) => (
                          <button
                            key={f}
                            type="button"
                            onClick={() => { setFontFamily(f); setFontDropdownOpen(false) }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-[12px] transition-colors",
                              f === fontFamily
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-text-main hover:bg-hover-bg"
                            )}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border-subtle bg-bg-sidebar/50">
                <button
                  type="button"
                  onClick={handleCancelTheme}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTheme}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
                >
                  Save & Apply
                </button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Center: Microfrontend Picker */}
      <div className="flex-1 flex items-center justify-center gap-1">
        {!isVersionHistory && microfrontendsList.length > 0 && (
          <Popover open={microfrontendOpen} onOpenChange={setMicrofrontendOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex h-7 items-center gap-1.5 px-2.5 rounded-lg border border-border-subtle bg-bg-sidebar text-text-main text-[12px] hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <Layers2 size={12} className="text-blue-500 shrink-0" />
                <span className="max-w-[160px] truncate">
                  {activeCodeSelection?.kind === 'microfrontend' ? activeCodeSelection.name : microfrontendsList[0].name}
                </span>
                {loadingPreviewId && <Loader2 size={10} className="animate-spin text-text-muted shrink-0" />}
                {!loadingPreviewId && <ChevronDown size={11} className={cn("transition-transform duration-200 text-text-muted", microfrontendOpen && "rotate-180")} />}
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" sideOffset={6} className="w-44 p-1">
              {microfrontendsList.map((mf) => {
                const isActive = activeCodeSelection?.kind === 'microfrontend' && activeCodeSelection.id === mf.id
                return (
                  <button
                    key={mf.id}
                    type="button"
                    disabled={loadingPreviewId === mf.id}
                    onClick={() => { handlePickMicrofrontend(mf); setMicrofrontendOpen(false) }}
                    className={cn(
                      "w-full flex items-center justify-between gap-1.5 px-2 py-1 rounded-md text-[11px] transition-colors text-left disabled:opacity-60",
                      isActive ? "bg-primary/10 text-primary font-medium" : "text-text-muted hover:bg-hover-bg hover:text-text-main"
                    )}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <Layers2 size={11} className="text-blue-500 shrink-0" />
                      <span className="truncate">{mf.name}</span>
                    </span>
                    {loadingPreviewId === mf.id
                      ? <Loader2 size={10} className="animate-spin text-text-muted shrink-0" />
                      : isActive && <Check size={10} className="shrink-0" />
                    }
                  </button>
                )
              })}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Right: Device Picker + Fullscreen */}
      <div className="flex items-center gap-0.5 shrink-0">
        <Popover open={deviceOpen} onOpenChange={setDeviceOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 items-center gap-1 px-2 rounded-lg transition-colors"
              title={selectedDevice.label}
            >
              {selectedDevice.icon}
              <ChevronDown
                size={12}
                className={cn("transition-transform duration-200", deviceOpen && "rotate-180")}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={6} className="w-36 p-1">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => { onDeviceChange?.(d.id); setDeviceOpen(false) }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] transition-colors",
                  d.id === device
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-muted hover:bg-hover-bg hover:text-text-main"
                )}
              >
                {d.icon}
                <span>{d.label}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>

        {!isVersionHistory && (
          <button
            type="button"
            onClick={onToggleMaximize}
            title={isMaximized ? 'Exit fullscreen' : 'Fullscreen'}
            className="text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          >
            {isMaximized ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 flex flex-col bg-bg-main relative overflow-hidden",
        isInspectMode && "cursor-crosshair"
      )}
    >
      {/* Build loading overlay */}
      {isLoading && (
        <WorkspaceLoader message="Building preview..." subMessage="Running esbuild" />
      )}

      {/* Switch microfrontend overlay */}
      {!isLoading && (!!loadingPreviewId || isMicrofrontendLoading) && (
        <WorkspaceLoader message="Loading microfrontend..." subMessage="Fetching codebase" />
      )}

      {/* Error overlay */}
      {runtimeError && !isLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-6 bg-bg-main/95 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-lg w-full bg-bg-card border border-border-subtle rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-start gap-3 p-5 border-b border-border-subtle">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-text-main">Ошибка в превью</h3>
                <p className="text-xs text-text-muted mt-0.5">
                  {runtimeError?.isBuildError ? 'Ошибка сборки проекта' : 'Произошла ошибка во время выполнения кода'}
                </p>
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
                {/* <button
                  type="button"
                  onClick={() => setRuntimeError(null)}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors rounded-lg"
                >
                  Закрыть
                </button> */}
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

      {/* Function selector — browser card with header, no iframe */}
      {isFunction ? (
        <div className={cn(
          "flex-1 flex justify-center items-start h-full overflow-auto transition-all duration-300",
          isMaximized ? "p-0" : "px-4",
        )}>
          <div
            className="flex flex-col flex-shrink-0 overflow-hidden border border-border-subtle shadow-md transition-all duration-300 bg-bg-main"
            style={{
              width: '100%',
              maxWidth: '100%',
              height: '100%',
              borderRadius: isMaximized ? '0px' : '12px',
            }}
          >
            {browserHeader}
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="max-w-sm w-full space-y-4">
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2 text-text-main font-semibold text-base">
                    <Zap size={16} className="text-primary" />
                    {activeCodeSelection?.name ?? 'Function'} selected
                  </div>
                  <p className="text-text-muted text-xs">Functions have no visual preview. Pick a frontend to preview instead.</p>
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={handlePickGeneratedFrontend}
                    className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-main bg-bg-card border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors text-left"
                  >
                    <Sparkles size={14} className="text-primary shrink-0" />
                    <span className="font-medium">Generated Frontend</span>
                  </button>
                  {microfrontendsList.length > 0 && (
                    <>
                      <p className="text-[10px] uppercase tracking-wider text-text-muted px-1 pt-2 flex items-center gap-1">
                        <Layers2 size={9} /> Microfrontends
                      </p>
                      {microfrontendsList.map((mf) => (
                        <button
                          key={mf.id}
                          type="button"
                          disabled={loadingPreviewId === mf.id}
                          onClick={() => handlePickMicrofrontend(mf)}
                          className="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-text-main bg-bg-card border border-border-subtle hover:border-primary/40 hover:bg-primary/5 transition-colors text-left disabled:opacity-60"
                        >
                          <span className="flex items-center gap-2">
                            <Layers2 size={14} className="text-blue-500 shrink-0" />
                            {mf.name}
                          </span>
                          {loadingPreviewId === mf.id && <Loader2 size={12} className="animate-spin text-text-muted shrink-0" />}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Normal preview — browser card with header + iframe as one unit */
        <div className={cn(
          "flex-1 flex justify-center items-start h-full overflow-auto transition-all duration-300",
          isMaximized ? "p-0" : "pb-2",
          !isMaximized && chatPosition === 'left' && (isChatCollapsed ? "px-4" : "pr-4 pl-0"),
          !isMaximized && chatPosition === 'right' && (isChatCollapsed ? "px-4" : "pl-4 pr-0"),
        )}>
          <div
            className="flex flex-col flex-shrink-0 overflow-hidden border border-border-subtle shadow-md transition-all duration-300"
            style={{
              width: iframeWidth,
              maxWidth: '100%',
              height: '100%',
              borderRadius: isMaximized ? '0px' : device === 'desktop' ? '12px' : '24px',
            }}
          >
            {browserHeader}
            <iframe
              ref={iframeRef}
              className="flex-1 w-full border-none bg-white"
              srcDoc={srcDoc}
              title="Project Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
            />
          </div>
        </div>
      )}
    </div>
  )
}
