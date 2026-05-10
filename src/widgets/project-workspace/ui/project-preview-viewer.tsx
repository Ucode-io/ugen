import { useState, useEffect, useRef, useMemo } from "react"
import { useVisualEditorStore } from "@/entities/visual-editor"
import { MoveablePrompt } from "./moveable-prompt"
import { ElementStyleToolbar } from "./element-style-toolbar"
import { useFilesStore } from "@/entities/project/model/files-store"
import { useChatStore } from "@/entities/chat"
import { buildProjectFromFiles, ensureEsbuild } from "../lib/bundler"
import { generatePreviewHtml } from "../lib/preview-html"
import {
  AlertTriangle, Loader2, Sparkles, Layers2, Zap,
  MousePointerClick, Monitor, Tablet, Smartphone,
  ChevronDown, Minimize, Maximize, Check,
  Palette, Upload, ChevronUp, Search, Save,
} from "lucide-react"
import { useDirtyFilesStore, getDirtyKey } from "@/entities/project/model/dirty-files-store"
import { autoCommit, requestSave, useGuardedAction } from "../lib/save-flow"
import { applyVisualEditToCss, buildSelector } from "../lib/visual-edits-css"

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
  device = `desktop`,
  isMaximized = false,
  versionPreviewFiles,
  projectId,
  onDeviceChange,
  onToggleMaximize,
  isChatCollapsed,
  chatPosition = "left",
  isVersionHistory = false,
}: ProjectPreviewViewerProps) => {
  const { isInspectMode, addSelectedElement, setInspectMode } =
    useVisualEditorStore();
  const { files: storeFiles, updateFile } = useFilesStore();
  const activeCodeSelection = useCodeSelectionStore(
    (s) => s.activeCodeSelection,
  );
  const activeCodeFiles = useCodeSelectionStore((s) => s.activeCodeFiles);
  const setActiveCodeSelection = useCodeSelectionStore(
    (s) => s.setActiveCodeSelection,
  );
  const apiKey = useAuthStore((s) => s.apiKey);

  const dirtyKey = getDirtyKey(activeCodeSelection ?? null);
  const dirtyMap = useDirtyFilesStore((s) =>
    dirtyKey ? s.dirty[dirtyKey] : undefined,
  );
  const setDirtyFile = useDirtyFilesStore((s) => s.setDirtyFile);
  const dirtyPaths = useMemo(() => Object.keys(dirtyMap ?? {}), [dirtyMap]);
  const hasDirty = dirtyPaths.length > 0;
  const guardedAction = useGuardedAction();

  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null);

  const isFunction = activeCodeSelection?.kind === "function";

  const { data: microfrontendsList = [] } = useQuery({
    queryKey: ["preview-microfrontends", projectId],
    queryFn: async () => {
      const headers = apiKey
        ? { Authorization: "API-KEY", "x-api-key": apiKey }
        : {};
      const { data } = await api.get("/v2/functions/micro-frontend", {
        params: { search: "", offset: 0, limit: 50, "project-id": projectId },
        headers,
      });
      return (data.data?.functions ?? []) as Array<{
        id: string;
        name: string;
        path?: string;
        branch?: string;
        type?: string;
        project_id?: string;
        url?: string;
      }>;
    },
    enabled: !!projectId,
    staleTime: 0,
  });

  // Files priority for the preview iframe:
  // 1. versionPreviewFiles (browsing version history)
  // 2. If a microfrontend is selected → its activeCodeFiles only — never fall back to
  //    storeFiles, otherwise we'd build the wrong code in the gap before MF codebase loads.
  // 3. Otherwise (frontend / no selection) → storeFiles
  // Dirty overlay (microfrontend only) is applied on top so the preview always
  // reflects unsaved edits from the code editor or theme/style toolbars.
  const isMicrofrontend = activeCodeSelection?.kind === "microfrontend";
  // null means "actively fetching" (set synchronously before the codebase API call).
  // An empty array means all retries returned nothing — treat as loaded so the preview
  // can show a build error rather than spinning forever.
  const isMicrofrontendLoading = isMicrofrontend && activeCodeFiles === null;
  const files = useMemo(() => {
    let base: { path: string; content: string; language: string }[];
    if (versionPreviewFiles && versionPreviewFiles.length > 0) {
      base = versionPreviewFiles.map((f) => ({
        path: f.path,
        content: f.content,
        language: getLanguageByPath(f.path),
      }));
    } else if (isMicrofrontend) {
      base = (activeCodeFiles ?? []).map((f: CodeSelectionFile) => ({
        path: f.path,
        content: f.content,
        language: getLanguageByPath(f.path),
      }));
    } else {
      base = storeFiles;
    }
    // Don't apply dirty overlay while viewing a historical version
    if (versionPreviewFiles && versionPreviewFiles.length > 0) return base;
    if (!dirtyMap || Object.keys(dirtyMap).length === 0) return base;
    const known = new Set(base.map((f) => f.path));
    const merged = base.map((f) =>
      dirtyMap[f.path] != null ? { ...f, content: dirtyMap[f.path] } : f,
    );
    // Include dirty-only files (e.g. CSS overrides we may add later)
    Object.keys(dirtyMap).forEach((path) => {
      if (!known.has(path)) {
        merged.push({
          path,
          content: dirtyMap[path],
          language: getLanguageByPath(path),
        });
      }
    });
    return merged;
  }, [
    versionPreviewFiles,
    isMicrofrontend,
    activeCodeFiles,
    storeFiles,
    dirtyMap,
  ]);

  console.log({ storeFiles, files });

  const handlePickMicrofrontend = (mf: {
    id: string;
    name: string;
    path?: string;
    branch?: string;
    type?: string;
    project_id?: string;
    repo_id?: string;
    url?: string;
  }) => {
    if (
      activeCodeSelection?.kind === "microfrontend" &&
      activeCodeSelection.id === mf.id
    )
      return;
    guardedAction(async () => {
      try {
        setLoadingPreviewId(mf.id);
        const headers = apiKey
          ? { Authorization: "API-KEY", "x-api-key": apiKey }
          : {};
        const { data } = await api.get(`/v2/function/${mf.id}/codebase`, {
          params: { "project-id": projectId },
          headers,
        });
        const fetched = (data?.data?.files ?? []) as CodeSelectionFile[];
        setActiveCodeSelection(
          {
            kind: "microfrontend",
            id: mf.id,
            name: mf.name,
            path: mf.path,
            branch: mf.branch ?? "master",
            type: mf.type,
            repoId: mf.repo_id,
            url: mf.url,
            projectId: mf.project_id,
          },
          fetched,
        );
      } catch (err) {
        console.error("Failed to load microfrontend for preview", err);
      } finally {
        setLoadingPreviewId(null);
      }
    });
  };

  const handlePickGeneratedFrontend = () => {
    guardedAction(() => {
      setActiveCodeSelection({ kind: "frontend" });
    });
  };

  const setPendingPrompt = useChatStore((s) => s.setPendingPrompt);
  const [srcDoc, setSrcDoc] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState<
    (PreviewRuntimeError & { isBuildError?: boolean }) | null
  >(null);

  // URL bar state
  const [currentUrl, setCurrentUrl] = useState("/");
  const [urlInput, setUrlInput] = useState("/");
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [microfrontendOpen, setMicrofrontendOpen] = useState(false);

  // Theme popover state
  const [themeOpen, setThemeOpen] = useState(false);
  const [themeSettings, setThemeSettings] = useState({
    background: "#F6F7F9",
    primary: "#493CDD",
    foreground: "#151A28",
    logoUrl: "",
  });
  const [fontFamily, setFontFamily] = useState("Inter");
  const [fontSearch, setFontSearch] = useState("");
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const fontPreviewLoadedRef = useRef(false);

  useEffect(() => {
    if (!fontDropdownOpen || fontPreviewLoadedRef.current) return;
    fontPreviewLoadedRef.current = true;
    const families = FONT_FAMILIES.map(
      (f) => `family=${f.replace(/\s+/g, "+")}`,
    ).join("&");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
    document.head.appendChild(link);
  }, [fontDropdownOpen]);
  // Snapshot of theme at the moment the popover opens — used to restore on Cancel
  const themeSnapshotRef = useRef({
    ...{
      background: "#F6F7F9",
      primary: "#493CDD",
      foreground: "#151A28",
      logoUrl: "",
    },
    fontFamily: "Inter",
  });

  const filteredFonts = FONT_FAMILIES.filter((f) =>
    f.toLowerCase().includes(fontSearch.toLowerCase()),
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isBuilding = useRef(false);

  // Keep a ref to files so message handler always sees the latest value
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  // Sync theme state from src/index.css — skip while the popover is open so user edits are not overwritten
  useEffect(() => {
    if (themeOpen) return;
    const cssFile = files.find((f) => f.path === "src/index.css");
    if (!cssFile?.content) return;
    const parsed = parseCssTheme(cssFile.content);
    setThemeSettings((prev) => ({
      ...prev,
      background: parsed.background,
      primary: parsed.primary,
      foreground: parsed.foreground,
    }));
    setFontFamily(parsed.fontFamily);
  }, [files, themeOpen]);

  // Build the override CSS+font link from the current theme inputs.
  // Returning a stable function via ref so the iframe load handler can call it
  // without becoming part of the React tree.
  const themeOverrideRef = useRef<{
    open: boolean;
    settings: typeof themeSettings;
    font: string;
  }>({
    open: themeOpen,
    settings: themeSettings,
    font: fontFamily,
  });
  useEffect(() => {
    themeOverrideRef.current = {
      open: themeOpen,
      settings: themeSettings,
      font: fontFamily,
    };
  }, [themeOpen, themeSettings, fontFamily]);

  const injectThemeOverride = () => {
    const { open, settings, font } = themeOverrideRef.current;
    if (!open) return; // popover closed → leave whatever's there; the next rebuild creates a fresh document
    const doc = iframeRef.current?.contentDocument;
    if (!doc?.documentElement) return;

    // Set CSS variables INLINE on :root. Inline styles trump every external
    // <style>, including the bundle's runtime-injected text/tailwindcss block
    // (which lands later async via esm.sh and would otherwise overwrite us).
    const root = doc.documentElement;
    root.style.setProperty("--background", hexToHslString(settings.background));
    root.style.setProperty("--foreground", hexToHslString(settings.foreground));
    root.style.setProperty("--primary", hexToHslString(settings.primary));
    root.style.setProperty("--font-body", `'${font}', sans-serif`);
    if (doc.body) doc.body.style.fontFamily = `'${font}', sans-serif`;

    let linkEl = doc.getElementById(
      "ugen-font-override",
    ) as HTMLLinkElement | null;
    if (!linkEl && doc.head) {
      linkEl = doc.createElement("link");
      linkEl.id = "ugen-font-override";
      linkEl.rel = "stylesheet";
      doc.head.appendChild(linkEl);
    }
    if (linkEl) {
      linkEl.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, "+")}:wght@300;400;500;600;700&display=swap`;
    }
  };

  /** Reset inline overrides — call when the iframe rebuilds with fresh CSS so the saved values take over. */
  const clearThemeOverride = () => {
    const root = iframeRef.current?.contentDocument?.documentElement;
    if (!root) return;
    root.style.removeProperty("--background");
    root.style.removeProperty("--foreground");
    root.style.removeProperty("--primary");
    root.style.removeProperty("--font-body");
    const body = iframeRef.current?.contentDocument?.body;
    if (body) body.style.removeProperty("font-family");
  };

  // Set true between Save click and the rebuild landing the saved CSS — keeps
  // the inline override visible during the rebuild gap so colors don't flash old.
  const themeSavePendingRef = useRef(false);

  // Inject on every theme/font change. On close: clear the inline overrides
  // unless a save is pending (in which case we wait for the rebuild to land).
  useEffect(() => {
    if (themeOpen) {
      injectThemeOverride();
    } else if (!themeSavePendingRef.current) {
      clearThemeOverride();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeSettings, fontFamily, themeOpen, srcDoc]);

  const handleThemeOpenChange = (open: boolean) => {
    if (open) {
      // Fresh editing session: snapshot current state and reset save flag.
      themeSnapshotRef.current = { ...themeSettings, fontFamily };
      themeSavePendingRef.current = false;
    } else if (!themeSavePendingRef.current) {
      // Closing without Save (outside click / Esc / Cancel) → revert to snapshot
      // so the effect clears inline overrides cleanly.
      const snap = themeSnapshotRef.current;
      setThemeSettings((prev) => ({
        ...prev,
        background: snap.background,
        primary: snap.primary,
        foreground: snap.foreground,
        logoUrl: snap.logoUrl,
      }));
      setFontFamily(snap.fontFamily);
    }
    setThemeOpen(open);
  };

  const handleCancelTheme = () => handleThemeOpenChange(false);

  const handleSaveTheme = () => {
    const cssFile = files.find((f) => f.path === "src/index.css");
    if (!cssFile) {
      setThemeOpen(false);
      return;
    }
    const newContent = applyThemeToCss(
      cssFile.content,
      themeSettings,
      fontFamily,
    );

    if (dirtyKey) {
      // Microfrontend: route through dirty store + auto-commit (like ElementStyleToolbar)
      const snap = themeSnapshotRef.current;
      const changed: string[] = [];
      if (snap.background !== themeSettings.background)
        changed.push("background");
      if (snap.primary !== themeSettings.primary) changed.push("primary");
      if (snap.foreground !== themeSettings.foreground)
        changed.push("foreground");
      if (snap.fontFamily !== fontFamily) changed.push("fontFamily");
      setDirtyFile(dirtyKey, "src/index.css", newContent);
      autoCommit(
        activeCodeSelection ?? null,
        `change: theme (${changed.join(", ") || "no-op"})`,
      );
    } else if (isMicrofrontend && activeCodeSelection && activeCodeFiles) {
      // Fallback (no dirty key — shouldn't happen for microfrontends, but keep behaviour)
      setActiveCodeSelection(
        activeCodeSelection,
        activeCodeFiles.map((f) =>
          f.path === "src/index.css" ? { ...f, content: newContent } : f,
        ),
      );
    } else {
      updateFile("src/index.css", newContent);
    }
    themeSavePendingRef.current = true;
    setThemeOpen(false);
  };

  const handleSaveAll = () => {
    void requestSave(activeCodeSelection ?? null).catch(() => {
      /* cancelled */
    });
  };

  // Floating Prompt States
  const [isPromptVisible, setIsPromptVisible] = useState(false);
  const [promptPosition, setPromptPosition] = useState({ x: 0, y: 0 });

  // Element Style Toolbar States
  const [isStyleToolbarVisible, setIsStyleToolbarVisible] = useState(false);
  const [styleToolbarPosition, setStyleToolbarPosition] = useState({
    x: 0,
    y: 0,
  });
  const [selectedDomPath, setSelectedDomPath] = useState<string | undefined>(
    undefined,
  );
  const [selectedTagName, setSelectedTagName] = useState<string | undefined>(
    undefined,
  );
  const [selectedContext, setSelectedContext] = useState<{
    sourceFile: string | null;
    sourceLine: number | null;
    outerHTML: string | null;
  } | null>(null);

  const runCode = async () => {
    if (isBuilding.current) return;
    isBuilding.current = true;
    setIsLoading(true);
    setRuntimeError(null);
    try {
      await ensureEsbuild();
      const { code, dependencies } = await buildProjectFromFiles(files, {
        VITE_API_BASE_URL: "http://localhost:3000",
        VITE_API_KEY: "",
        VITE_X_API_KEY: "",
        VITE_MAP_TILE_URL: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        VITE_APP_NAME: "App",
        NODE_ENV: "development",
      });
      const html = generatePreviewHtml(code, dependencies, files);
      setSrcDoc(html);
    } catch (err: any) {
      const errorMessage = err.message || "Unknown build error";
      setSrcDoc(
        `<html><body style="background:#1e1e1e;color:#f87171;padding:2rem;font-family:monospace;white-space:pre-wrap;">${errorMessage}</body></html>`,
      );
      setRuntimeError({
        message: errorMessage,
        stack: err.stack ?? null,
        isBuildError: true,
      });
    } finally {
      setIsLoading(false);
      isBuilding.current = false;
    }
  };

  const handleRefresh = () => {
    isBuilding.current = false;
    setCurrentUrl("/");
    setUrlInput("/");
    runCode();
  };

  const handleUrlNavigate = () => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "NAVIGATE", url: urlInput },
      "*",
    );
    setCurrentUrl(urlInput);
  };

  const filesHash = useMemo(() => {
    return files.map((f) => f.path + ":" + f.content?.length).join("|");
  }, [files]);

  // Wait for the SSE to fully close before building — `chunk_done`/`done` events
  // arrive mid-stream and would otherwise trigger premature rebuilds.
  const isStreaming = useChatStore((s) => s.isStreaming);

  useEffect(() => {
    // Skip while microfrontend codebase is still loading or chat is streaming —
    // those states have their own loaders. Don't leave "Building preview" hanging
    // when no build is actually scheduled.
    if (isMicrofrontendLoading || isStreaming) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const timeout = setTimeout(() => {
      runCode();
    }, 1000);
    return () => clearTimeout(timeout);
  }, [filesHash, isMicrofrontendLoading, isStreaming]);

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: isInspectMode ? "INSPECT_ON" : "INSPECT_OFF" },
        "*",
      );
    }
  }, [isInspectMode, srcDoc]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === "ROUTE_CHANGE") {
        const url = e.data.url || "/";
        setCurrentUrl(url);
        setUrlInput(url);
        return;
      }

      if (e.data?.type === "PREVIEW_RUNTIME_ERROR") {
        setRuntimeError({
          message: e.data.message,
          stack: e.data.stack,
          filename: e.data.filename,
          lineno: e.data.lineno,
          colno: e.data.colno,
        });
        return;
      }

      if (e.data?.type === "INSPECT_SELECT") {
        const {
          tag,
          id,
          className,
          name,
          domPath,
          textContent,
          rect,
          componentName,
          outerHTML,
        } = e.data;

        // Find the component definition in source files by component name
        let sourceFile: string | null = null;
        let sourceLine: number | null = null;
        if (componentName) {
          const patterns = [
            new RegExp(
              `(export\\s+)?(default\\s+)?function\\s+${componentName}\\b`,
            ),
            new RegExp(`(export\\s+)?const\\s+${componentName}\\s*[=:]`),
            new RegExp(`(export\\s+)?class\\s+${componentName}\\b`),
          ];
          outer: for (const file of filesRef.current) {
            if (!file.content) continue;
            const lines = file.content.split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (patterns.some((p) => p.test(lines[i]))) {
                sourceFile = file.path;
                sourceLine = i + 1;
                break outer;
              }
            }
          }
        }

        addSelectedElement({
          id: Math.random().toString(36).substr(2, 9),
          tagName: tag.toUpperCase(),
          className: className
            ? className.split(" ").slice(0, 3).join(" ")
            : "",
          htmlId: id || undefined,
          dataName: name || undefined,
          domPath: domPath || undefined,
          textContent: textContent || undefined,
          sourceFile,
          sourceLine,
          outerHTML: outerHTML || null,
        });
        setSelectedDomPath(domPath || undefined);
        setSelectedTagName(typeof tag === "string" ? tag : undefined);
        setSelectedContext({
          sourceFile,
          sourceLine,
          outerHTML: outerHTML || null,
        });
        if (rect && containerRef.current) {
          // Style toolbar — above the element (fall back to below if no room)
          const toolbarHeight = 48;
          const aboveY = rect.top - toolbarHeight - 12;
          const belowY = rect.top + rect.height + 12;
          setIsStyleToolbarVisible(true);
          setStyleToolbarPosition({
            x: Math.max(20, rect.left + rect.width / 2 - 200),
            y: Math.max(20, aboveY > 20 ? aboveY : belowY),
          });
          // AI prompt position pre-computed for when user opens it
          setPromptPosition({
            x: Math.max(20, rect.left + rect.width / 2 - 300),
            y: Math.max(20, rect.top + rect.height + 20),
          });
          setIsPromptVisible(false);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [addSelectedElement]);

  const handleFixInChat = () => {
    if (!runtimeError) return;
    const location = runtimeError.filename
      ? `\nFile: ${runtimeError.filename}${runtimeError.lineno ? `:${runtimeError.lineno}${runtimeError.colno ? `:${runtimeError.colno}` : ""}` : ""}`
      : "";
    const stack = runtimeError.stack ? `\n\nStack:\n${runtimeError.stack}` : "";
    const content = `Исправь ошибку в превью проекта.\n\nОшибка: ${runtimeError.message}${location}${stack}`;
    setPendingPrompt({ content });
    setRuntimeError(null);
  };

  const iframeWidth = DEVICE_WIDTHS[device];
  const selectedDevice = DEVICES.find((d) => d.id === device) ?? DEVICES[0];

  // Shared browser header JSX (rendered inside the card)
  const browserHeader = (
    <div className="border-border-subtle bg-bg-card flex h-10 shrink-0 items-center justify-between gap-2 border-b px-2">
      {/* Left: Logo (fullscreen only) + Visual Edit */}
      <div className="flex shrink-0 items-center gap-1.5">
        {isMaximized && (
          <>
            <img
              src="/ugen-logo.svg"
              className="block h-5 w-auto dark:hidden"
              alt="ugen"
            />
            <img
              src="/ugen-logo-dark.svg"
              className="hidden h-5 w-auto dark:block"
              alt="ugen"
            />
            <div className="bg-border-subtle mx-0.5 h-4 w-px" />
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
                : "text-text-muted hover:bg-hover-bg hover:text-text-main",
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
                    : "text-text-muted hover:bg-hover-bg hover:text-text-main",
                )}
              >
                <Palette size={13} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={8} className="w-72 p-0">
              {/* Header */}
              <div className="border-border-subtle border-b px-4 pt-4 pb-3">
                <h3 className="text-text-main text-sm font-semibold">Theme</h3>
                <p className="text-text-muted mt-0.5 text-[11px]">
                  Colors and fonts for your project.
                </p>
              </div>

              <div className="space-y-4 px-4 py-3">
                {/* Colors */}
                <div className="space-y-2">
                  <p className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
                    Colors
                  </p>
                  {(
                    [
                      { key: "background", label: "Background" },
                      { key: "primary", label: "Primary" },
                      { key: "foreground", label: "Foreground" },
                    ] as const
                  ).map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-text-main text-[13px]">
                        {label}
                      </span>
                      <label className="group flex cursor-pointer items-center gap-2">
                        <span className="text-text-muted group-hover:text-text-main font-mono text-[12px] transition-colors">
                          {themeSettings[key].toUpperCase()}
                        </span>
                        <div
                          className="border-border-subtle relative h-6 w-6 overflow-hidden rounded border shadow-sm"
                          style={{ backgroundColor: themeSettings[key] }}
                        >
                          <input
                            type="color"
                            value={themeSettings[key]}
                            onChange={(e) =>
                              setThemeSettings((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          />
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <p className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
                    Logo
                  </p>
                  <div className="flex items-center gap-2">
                    {themeSettings.logoUrl ? (
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <img
                          src={themeSettings.logoUrl}
                          alt="Logo"
                          className="border-border-subtle h-7 w-auto max-w-20 rounded border object-contain"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setThemeSettings((prev) => ({
                              ...prev,
                              logoUrl: "",
                            }))
                          }
                          className="text-text-muted ml-auto shrink-0 text-[11px] transition-colors hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="border-border-subtle hover:border-primary/50 hover:bg-primary/5 text-text-muted hover:text-primary flex w-full items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-1.5 text-[12px] transition-colors"
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
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (ev) =>
                          setThemeSettings((prev) => ({
                            ...prev,
                            logoUrl: ev.target?.result as string,
                          }));
                        reader.readAsDataURL(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>

                {/* Font Family */}
                <div className="space-y-2">
                  <p className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
                    Font Family
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFontDropdownOpen((o) => !o);
                      setFontSearch("");
                    }}
                    className="border-border-subtle bg-bg-sidebar text-text-main hover:border-primary/40 hover:bg-primary/5 flex w-full items-center justify-between rounded-lg border px-3 py-1.5 text-[13px] transition-colors"
                  >
                    <span>{fontFamily}</span>
                    {fontDropdownOpen ? (
                      <ChevronUp size={12} className="text-text-muted" />
                    ) : (
                      <ChevronDown size={12} className="text-text-muted" />
                    )}
                  </button>
                  {fontDropdownOpen && (
                    <div className="border-border-subtle overflow-hidden rounded-lg border">
                      <div className="border-border-subtle bg-bg-sidebar flex items-center gap-2 border-b px-2.5 py-1.5">
                        <Search
                          size={11}
                          className="text-text-muted shrink-0"
                        />
                        <input
                          autoFocus
                          type="text"
                          value={fontSearch}
                          onChange={(e) => setFontSearch(e.target.value)}
                          placeholder="Search fonts..."
                          className="text-text-main placeholder:text-text-muted flex-1 bg-transparent text-[12px] outline-none"
                        />
                      </div>
                      <div className="max-h-36 overflow-y-auto">
                        {filteredFonts.length === 0 ? (
                          <p className="text-text-muted px-3 py-2 text-[12px]">
                            No fonts found
                          </p>
                        ) : (
                          filteredFonts.map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => {
                                setFontFamily(f);
                                setFontDropdownOpen(false);
                              }}
                              className={cn(
                                "w-full px-3 py-1.5 text-left text-[12px] transition-colors",
                                f === fontFamily
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-text-main hover:bg-hover-bg",
                              )}
                              style={{ fontFamily: `'${f}', sans-serif` }}
                            >
                              {f}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="border-border-subtle bg-bg-sidebar/50 flex items-center justify-end gap-2 border-t px-4 py-3">
                <button
                  type="button"
                  onClick={handleCancelTheme}
                  className="text-text-muted hover:text-text-main hover:bg-hover-bg rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveTheme}
                  className="bg-primary hover:bg-primary/90 rounded-lg px-3 py-1.5 text-[12px] font-medium text-white transition-colors"
                >
                  Save & Apply
                </button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Center: Microfrontend Picker */}
      <div
        className={`flex flex-1 items-center justify-center gap-1 ${device === "mobile" ? "w-[100px]" : ""}`}
      >
        {!isVersionHistory && microfrontendsList.length > 0 && (
          <Popover open={microfrontendOpen} onOpenChange={setMicrofrontendOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "border-border-subtle bg-bg-sidebar text-text-main hover:border-primary/40 hover:bg-primary/5 flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] transition-colors",
                  device === "mobile" ? "w-[100px]" : "",
                )}
              >
                <Layers2 size={12} className="shrink-0 text-blue-500" />
                <span className="max-w-[160px] truncate">
                  {activeCodeSelection?.kind === "microfrontend"
                    ? activeCodeSelection.name
                    : microfrontendsList[0].name}
                </span>
                {loadingPreviewId && (
                  <Loader2
                    size={10}
                    className="text-text-muted shrink-0 animate-spin"
                  />
                )}
                {!loadingPreviewId && (
                  <ChevronDown
                    size={11}
                    className={cn(
                      "text-text-muted transition-transform duration-200",
                      microfrontendOpen && "rotate-180",
                    )}
                  />
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="center" sideOffset={6} className="w-44 p-1">
              {microfrontendsList.map((mf) => {
                const isActive =
                  activeCodeSelection?.kind === "microfrontend" &&
                  activeCodeSelection.id === mf.id;
                return (
                  <button
                    key={mf.id}
                    type="button"
                    disabled={loadingPreviewId === mf.id}
                    onClick={() => {
                      handlePickMicrofrontend(mf);
                      setMicrofrontendOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-1.5 rounded-md px-2 py-1 text-left text-[11px] transition-colors disabled:opacity-60",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-text-muted hover:bg-hover-bg hover:text-text-main",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Layers2 size={11} className="shrink-0 text-blue-500" />
                      <span className="truncate">{mf.name}</span>
                    </span>
                    {loadingPreviewId === mf.id ? (
                      <Loader2
                        size={10}
                        className="text-text-muted shrink-0 animate-spin"
                      />
                    ) : (
                      isActive && <Check size={10} className="shrink-0" />
                    )}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Right: Save (when dirty) + Device Picker + Fullscreen */}
      <div className="flex shrink-0 items-center gap-0.5">
        {!isVersionHistory && hasDirty && (
          <button
            type="button"
            onClick={handleSaveAll}
            title={`Save ${dirtyPaths.length} change${dirtyPaths.length === 1 ? "" : "s"}`}
            className="bg-primary hover:bg-primary/90 mr-1 inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-white transition-colors"
          >
            <Save size={12} />
            Save ({dirtyPaths.length})
          </button>
        )}
        <Popover open={deviceOpen} onOpenChange={setDeviceOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 items-center gap-1 rounded-lg px-2 transition-colors"
              title={selectedDevice.label}
            >
              {selectedDevice.icon}
              <ChevronDown
                size={12}
                className={cn(
                  "transition-transform duration-200",
                  deviceOpen && "rotate-180",
                )}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={6} className="w-36 p-1">
            {DEVICES.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onDeviceChange?.(d.id);
                  setDeviceOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors",
                  d.id === device
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-text-muted hover:bg-hover-bg hover:text-text-main",
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
            title={isMaximized ? "Exit fullscreen" : "Fullscreen"}
            className="text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          >
            {isMaximized ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-bg-main relative flex flex-1 flex-col overflow-hidden",
        isInspectMode && "cursor-crosshair",
      )}
    >
      {/* Error overlay */}
      {runtimeError && (
        <div className="bg-bg-main/95 animate-in fade-in absolute inset-0 z-40 flex items-center justify-center p-6 backdrop-blur-sm duration-200">
          <div className="bg-bg-card border-border-subtle w-full max-w-lg overflow-hidden rounded-2xl border shadow-xl">
            <div className="border-border-subtle flex items-start gap-3 border-b p-5">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-text-main text-base font-semibold">
                  Ошибка в превью
                </h3>
                <p className="text-text-muted mt-0.5 text-xs">
                  {runtimeError?.isBuildError
                    ? "Ошибка сборки проекта"
                    : "Произошла ошибка во время выполнения кода"}
                </p>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <div className="bg-bg-sidebar/60 border-border-subtle/60 max-h-40 overflow-auto rounded-lg border p-3">
                <pre className="font-mono text-xs break-words whitespace-pre-wrap text-red-500">
                  {runtimeError.message}
                </pre>
                {runtimeError.filename && (
                  <p className="text-text-muted mt-2 font-mono text-[11px] break-all">
                    {runtimeError.filename}
                    {runtimeError.lineno ? `:${runtimeError.lineno}` : ""}
                    {runtimeError.colno ? `:${runtimeError.colno}` : ""}
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
                  className="bg-primary hover:bg-primary/90 active:bg-primary/80 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors"
                >
                  <Sparkles className="h-4 w-4" />
                  Исправить в чате
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Element Style Toolbar — direct visual editing */}
      <ElementStyleToolbar
        isVisible={isStyleToolbarVisible && isInspectMode && !isPromptVisible}
        position={styleToolbarPosition}
        containerRef={containerRef}
        iframeRef={iframeRef}
        domPath={selectedDomPath}
        tagName={selectedTagName}
        onCommitStyles={(stylePatch, meta) => {
          if (!dirtyKey) return;
          const selector = buildSelector(
            selectedDomPath ?? null,
            selectedContext?.outerHTML ?? null,
          );
          if (!selector) return;
          const cssFile = filesRef.current.find(
            (f) => f.path === "src/index.css",
          );
          const baseCss = cssFile?.content ?? "";
          const nextCss = applyVisualEditToCss(baseCss, {
            selector,
            styles: stylePatch,
          });
          setDirtyFile(dirtyKey, "src/index.css", nextCss);
          const tagLabel = (
            meta.tagName ||
            selectedTagName ||
            "element"
          ).toLowerCase();
          autoCommit(
            activeCodeSelection ?? null,
            `change: '${tagLabel}' element style`,
          );
        }}
        onClose={() => {
          setIsStyleToolbarVisible(false);
          setIsPromptVisible(false);
          iframeRef.current?.contentWindow?.postMessage(
            { type: "INSPECT_DESELECT" },
            "*",
          );
        }}
        onOpenAiPrompt={() => setIsPromptVisible(true)}
      />

      {/* Floating Prompt Bar — AI editing (replaces toolbar while open) */}
      <MoveablePrompt
        isVisible={isPromptVisible && isInspectMode}
        initialPosition={promptPosition}
        containerRef={containerRef}
        onBack={() => setIsPromptVisible(false)}
        onClose={() => {
          setIsPromptVisible(false);
          setIsStyleToolbarVisible(false);
          iframeRef.current?.contentWindow?.postMessage(
            { type: "INSPECT_DESELECT" },
            "*",
          );
        }}
        onSubmit={(text) => {
          const context = selectedContext
            ? [
                {
                  path: selectedContext.sourceFile,
                  line: selectedContext.sourceLine,
                  element: selectedContext.outerHTML,
                },
              ]
            : undefined;
          setPendingPrompt({ content: text, context });
          setIsPromptVisible(false);
          setIsStyleToolbarVisible(false);
          iframeRef.current?.contentWindow?.postMessage(
            { type: "INSPECT_DESELECT" },
            "*",
          );
        }}
      />

      {/* Function selector — browser card with header, no iframe */}
      {isFunction ? (
        <div
          className={cn(
            "flex h-full flex-1 items-start justify-center overflow-auto transition-all duration-300",
            isMaximized ? "p-0" : "px-4",
          )}
        >
          <div
            className="border-border-subtle bg-bg-main flex flex-shrink-0 flex-col overflow-hidden border shadow-md transition-all duration-300"
            style={{
              width: "100%",
              maxWidth: "100%",
              height: "100%",
              borderRadius: isMaximized ? "0px" : "12px",
            }}
          >
            {browserHeader}
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="w-full max-w-sm space-y-4">
                <div className="space-y-1 text-center">
                  <div className="text-text-main flex items-center justify-center gap-2 text-base font-semibold">
                    <Zap size={16} className="text-primary" />
                    {activeCodeSelection?.name ?? "Function"} selected
                  </div>
                  <p className="text-text-muted text-xs">
                    Functions have no visual preview. Pick a frontend to preview
                    instead.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={handlePickGeneratedFrontend}
                    className="text-text-main bg-bg-card border-border-subtle hover:border-primary/40 hover:bg-primary/5 flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors"
                  >
                    <Sparkles size={14} className="text-primary shrink-0" />
                    <span className="font-medium">Generated Frontend</span>
                  </button>
                  {microfrontendsList.length > 0 && (
                    <>
                      <p className="text-text-muted flex items-center gap-1 px-1 pt-2 text-[10px] tracking-wider uppercase">
                        <Layers2 size={9} /> Microfrontends
                      </p>
                      {microfrontendsList.map((mf) => (
                        <button
                          key={mf.id}
                          type="button"
                          disabled={loadingPreviewId === mf.id}
                          onClick={() => handlePickMicrofrontend(mf)}
                          className="text-text-main bg-bg-card border-border-subtle hover:border-primary/40 hover:bg-primary/5 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-60"
                        >
                          <span className="flex items-center gap-2">
                            <Layers2
                              size={14}
                              className="shrink-0 text-blue-500"
                            />
                            {mf.name}
                          </span>
                          {loadingPreviewId === mf.id && (
                            <Loader2
                              size={12}
                              className="text-text-muted shrink-0 animate-spin"
                            />
                          )}
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
        <div
          className={cn(
            "flex h-full flex-1 items-start justify-center overflow-auto transition-all duration-300",
            isMaximized ? "p-0" : "pb-2",
            !isMaximized &&
              chatPosition === "left" &&
              (isChatCollapsed ? "px-4" : "pr-4 pl-0"),
            !isMaximized &&
              chatPosition === "right" &&
              (isChatCollapsed ? "px-4" : "pr-0 pl-4"),
          )}
        >
          <div
            className="border-border-subtle relative flex flex-shrink-0 flex-col overflow-hidden border shadow-md transition-all duration-300"
            style={{
              width: iframeWidth,
              maxWidth: "100%",
              height: "100%",
              borderRadius: isMaximized
                ? "0px"
                : device === "desktop"
                  ? "12px"
                  : "24px",
            }}
          >
            {browserHeader}
            {/* Microfrontend loading overlay (takes priority) */}
            {(!!loadingPreviewId || isMicrofrontendLoading) && (
              <WorkspaceLoader
                message="Loading microfrontend..."
                subMessage="Fetching codebase"
              />
            )}
            {/* Build loading overlay — hidden when an error is shown */}
            {isLoading && !runtimeError && !loadingPreviewId && !isMicrofrontendLoading && (
              <WorkspaceLoader
                message="Building preview..."
                subMessage="Running esbuild"
              />
            )}
            <iframe
              ref={iframeRef}
              className="w-full flex-1 border-none bg-white"
              srcDoc={srcDoc}
              title="Project Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
              onLoad={() => {
                // Fresh document — drop any leftover inline overrides so the bundle's CSS values show.
                themeSavePendingRef.current = false;
                clearThemeOverride();
                // If the popover is still open (e.g. user kept it open through a save), re-inject.
                if (themeOpen) injectThemeOverride();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
