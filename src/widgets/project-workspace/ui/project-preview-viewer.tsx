import { useState, useEffect, useRef, useMemo, useReducer } from "react";
import { useVisualEditorStore } from "@/entities/visual-editor";
import { MoveablePrompt } from "./moveable-prompt";
import { ElementStyleToolbar } from "./element-style-toolbar";
import { useFilesStore } from "@/entities/project/model/files-store";
import { useShallow } from "zustand/react/shallow";
import { useChatStore } from "@/entities/chat";
import { buildProjectFromFiles, ensureEsbuild } from "../lib/bundler";
import {
  generatePreviewHtml,
  PREVIEW_RUNTIME_VERSION,
} from "../lib/preview-html";
import { createBuildTimer, type BuildTimer } from "../lib/build-timer";
import {
  getCachedBuild,
  setCachedBuild,
  hashFiles,
  makeBuildCacheKey,
} from "../lib/build-cache";
import { previewOptimizationsEnabled } from "../lib/preview-flags";
import {
  AlertTriangle,
  Loader2,
  Sparkles,
  Layers2,
  Zap,
  MousePointerClick,
  Monitor,
  Tablet,
  Smartphone,
  ChevronDown,
  Minimize,
  Maximize,
  Check,
  Save,
  RotateCcw,
  X,
} from "lucide-react";
import {
  useDirtyFilesStore,
  getDirtyKey,
} from "@/entities/project/model/dirty-files-store";
import { autoCommit, requestSave, useGuardedAction } from "../lib/save-flow";
import { applyVisualEditToCss, buildSelector } from "../lib/visual-edits-css";
import { toPng } from "html-to-image";
import { fileService } from "@/shared/api/file-service";
import {
  ThemePopover,
  type ColorDefinition,
  type ColorGroup,
} from "./theme-popover";
import { MobilePreviewPanel } from "./mobile-web-preview";
import { MobileActionsPanel } from "./mobile-actions-panel";
import { MobileCapabilitySimulation } from "./mobile-capability-simulation";
import { PhoneShell, PHONE_SAFE_AREA_TOP } from "./mobile-phone-shell";
import { useMobileProjectStore } from "@/entities/project/model/mobile-project-store";
import {
  INITIAL_MOBILE_SIMULATION_STATE,
  mobileSimulationReducer,
} from "@/entities/project/model/mobile-capabilities";

// Shadcn CSS stores HSL as "H S% L%" (space-separated, no hsl() wrapper).
// Newer generated templates use hex directly (e.g. `--primary: #4f46e5`).
// We detect the format per-variable on read and write back in the same shape.
type ColorFormat = "hex" | "hsl";

function hslStringToHex(hsl: string): string {
  const [hStr, sStr, lStr] = hsl.trim().split(/\s+/);
  const h = parseFloat(hStr);
  const s = parseFloat(sStr) / 100;
  const l = parseFloat(lStr) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }
  const hex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function hexToHslString(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0,
    s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function detectColorFormat(raw: string): ColorFormat {
  return raw.trim().startsWith("#") ? "hex" : "hsl";
}

function parseColorToHex(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("#")) {
    if (trimmed.length === 4) {
      // #rgb → #rrggbb
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
    }
    return trimmed.slice(0, 7).toLowerCase();
  }
  return hslStringToHex(trimmed).toLowerCase();
}

function formatColorFromHex(hex: string, format: ColorFormat): string {
  return format === "hex" ? hex.toLowerCase() : hexToHslString(hex);
}

// Known shadcn-style variables. We use these to keep nicer labels and a stable
// section order; anything else discovered in the CSS lands in the "Custom" group.
const PREDEFINED_GROUPS: ColorGroup[] = [
  {
    title: "Base",
    colors: [
      { cssVar: "background", label: "Background" },
      { cssVar: "foreground", label: "Foreground" },
    ],
  },
  {
    title: "Card",
    colors: [
      { cssVar: "card", label: "Card" },
      { cssVar: "card-foreground", label: "Card Text" },
    ],
  },
  {
    title: "Primary",
    colors: [
      { cssVar: "primary", label: "Primary" },
      { cssVar: "primary-foreground", label: "Primary Text" },
    ],
  },
  {
    title: "Secondary",
    colors: [
      { cssVar: "secondary", label: "Secondary" },
      { cssVar: "secondary-foreground", label: "Secondary Text" },
    ],
  },
  {
    title: "Muted",
    colors: [
      { cssVar: "muted", label: "Muted" },
      { cssVar: "muted-foreground", label: "Muted Text" },
    ],
  },
  {
    title: "Accent",
    colors: [
      { cssVar: "accent", label: "Accent" },
      { cssVar: "accent-foreground", label: "Accent Text" },
    ],
  },
  {
    title: "Popover",
    colors: [
      { cssVar: "popover", label: "Popover" },
      { cssVar: "popover-foreground", label: "Popover Text" },
    ],
  },
  {
    title: "Destructive",
    colors: [
      { cssVar: "destructive", label: "Destructive" },
      { cssVar: "destructive-foreground", label: "Destructive Text" },
    ],
  },
  {
    title: "Status",
    colors: [
      { cssVar: "success", label: "Success" },
      { cssVar: "success-foreground", label: "Success Text" },
      { cssVar: "warning", label: "Warning" },
      { cssVar: "warning-foreground", label: "Warning Text" },
      { cssVar: "info", label: "Info" },
      { cssVar: "info-foreground", label: "Info Text" },
    ],
  },
  {
    title: "UI",
    colors: [
      { cssVar: "border", label: "Border" },
      { cssVar: "input", label: "Input" },
      { cssVar: "ring", label: "Ring" },
    ],
  },
  {
    title: "Sidebar",
    colors: [
      { cssVar: "sidebar-background", label: "Background" },
      { cssVar: "sidebar-foreground", label: "Foreground" },
      { cssVar: "sidebar-primary", label: "Primary" },
      { cssVar: "sidebar-primary-foreground", label: "Primary Text" },
      { cssVar: "sidebar-accent", label: "Accent" },
      { cssVar: "sidebar-accent-foreground", label: "Accent Text" },
      { cssVar: "sidebar-border", label: "Border" },
      { cssVar: "sidebar-ring", label: "Ring" },
    ],
  },
];

const PREDEFINED_VAR_NAMES: Set<string> = new Set(
  PREDEFINED_GROUPS.flatMap((g) => g.colors).map((c) => c.cssVar),
);

function isColorValue(value: string): boolean {
  const v = value.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(v)) return true;
  // shadcn HSL: "H S% L%" — hue allows decimals; saturation/lightness end with %
  if (/^[\d.]+\s+[\d.]+%\s+[\d.]+%$/.test(v)) return true;
  return false;
}

interface ExtractedColor {
  cssVar: string;
  rawValue: string;
  format: ColorFormat;
  hex: string;
}

function extractColorVarsFromCss(css: string): ExtractedColor[] {
  const out: ExtractedColor[] = [];
  // Capture order is preserved by RegExp.exec on a global pattern.
  const regex = /--([\w-]+)\s*:\s*([^;]+);/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(css)) !== null) {
    const cssVar = match[1];
    const rawValue = match[2].trim();
    if (!isColorValue(rawValue)) continue;
    out.push({
      cssVar,
      rawValue,
      format: detectColorFormat(rawValue),
      hex: parseColorToHex(rawValue),
    });
  }
  return out;
}

function humanizeVarName(cssVar: string): string {
  return cssVar
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

function parseCssTheme(css: string): {
  colors: Record<string, string>;
  formats: Record<string, ColorFormat>;
  groups: ColorGroup[];
  fontFamily: string;
} {
  const found = extractColorVarsFromCss(css);
  const foundMap = new Map(found.map((c) => [c.cssVar, c]));

  const colors: Record<string, string> = {};
  const formats: Record<string, ColorFormat> = {};
  for (const c of found) {
    colors[c.cssVar] = c.hex;
    formats[c.cssVar] = c.format;
  }

  // Build groups: keep predefined order, drop sections with nothing in CSS,
  // then append a "Custom" group for any color vars we didn't predefine.
  const groups: ColorGroup[] = [];
  const usedVars = new Set<string>();
  for (const group of PREDEFINED_GROUPS) {
    const present = group.colors.filter((c) => foundMap.has(c.cssVar));
    if (present.length === 0) continue;
    groups.push({ title: group.title, colors: present });
    present.forEach((c) => usedVars.add(c.cssVar));
  }
  const custom: ColorDefinition[] = [];
  for (const c of found) {
    if (usedVars.has(c.cssVar)) continue;
    custom.push({ cssVar: c.cssVar, label: humanizeVarName(c.cssVar) });
  }
  if (custom.length > 0) groups.push({ title: "Custom", colors: custom });

  const fontBodyRaw =
    css
      .match(/--font-body:\s*['"]?([^'",;\n]+)/)?.[1]
      .trim()
      .replace(/^['"]|['"]$/g, "") ?? "Inter";

  return { colors, formats, groups, fontFamily: fontBodyRaw };
}

function applyThemeToCss(
  css: string,
  colors: Record<string, string>,
  formats: Record<string, ColorFormat>,
  font: string,
): string {
  let result = css;

  for (const [cssVar, hex] of Object.entries(colors)) {
    if (!hex) continue;
    const format = formats[cssVar] ?? "hex";
    const formatted = formatColorFromHex(hex, format);
    if (format === "hex") {
      result = result.replace(
        new RegExp(`(--${cssVar}:\\s*)#[0-9a-fA-F]{3,8}`),
        `$1${formatted}`,
      );
    } else {
      result = result.replace(
        new RegExp(`(--${cssVar}:\\s*)[\\d.]+\\s+[\\d.]+%\\s+[\\d.]+%`),
        `$1${formatted}`,
      );
    }
  }

  // Update font-body variable and its Google Fonts import
  const currentFont = css
    .match(/--font-body:\s*['"]?([^'",;\n]+)/)?.[1]
    .trim()
    .replace(/^['"]|['"]$/g, "");
  if (currentFont && currentFont !== font) {
    result = result.replace(
      /--font-body:\s*[^;]+;/,
      `--font-body: '${font}', sans-serif;`,
    );
    const encodedCurrent = currentFont.replace(/\s+/g, "+");
    const encodedNew = font.replace(/\s+/g, "+");
    result = result.replace(
      new RegExp(
        `@import url\\(['"]https://fonts\\.googleapis\\.com/css2\\?family=${encodedCurrent}[^'"]*['"]\\);`,
      ),
      `@import url('https://fonts.googleapis.com/css2?family=${encodedNew}:wght@300;400;500;600;700&display=swap');`,
    );
  }

  return result;
}
import type { DeviceType } from "./project-header";
import { useAuthStore } from "@/entities/session";
import { useCodeSelectionStore } from "@/entities/project/model/code-selection-store";
import type { CodeSelectionFile } from "@/entities/project/model/code-selection-store";
import { api } from "@/shared/api";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui";
import { cn } from "@/shared/lib/utils/cn";
import { WorkspaceLoader } from "./workspace-loader";

interface PreviewRuntimeError {
  message: string;
  stack?: string | null;
  filename?: string | null;
  lineno?: number | null;
  colno?: number | null;
}

const DEVICE_WIDTHS: Record<DeviceType, string> = {
  desktop: "100%",
  tablet: "768px",
  mobile: "375px",
};

const DEVICES: { id: DeviceType; label: string; icon: React.ReactNode }[] = [
  { id: "desktop", label: "Desktop", icon: <Monitor size={14} /> },
  { id: "tablet", label: "Tablet", icon: <Tablet size={14} /> },
  { id: "mobile", label: "Mobile", icon: <Smartphone size={14} /> },
];

/** App type stored on the MCP project (`project_type`). */
export type ProjectType =
  | "admin_panel"
  | "web"
  | "landing"
  | "webapp"
  | "mobile";

interface ProjectPreviewViewerProps {
  device?: DeviceType;
  isMaximized?: boolean;
  isChatCollapsed?: boolean;
  chatPosition?: "left" | "right";
  versionPreviewFiles?: { path: string; content: string }[] | null;
  projectId?: string;
  /** Hosted URL of the published app, used for the mobile QR preview panel. */
  shareUrl?: string;
  onDeviceChange?: (device: DeviceType) => void;
  onToggleMaximize?: () => void;
  isVersionHistory?: boolean;
}

const getLanguageByPath = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
      return "javascript";
    case "ts":
    case "tsx":
      return "typescript";
    case "json":
      return "json";
    case "css":
      return "css";
    case "html":
      return "html";
    default:
      return "javascript";
  }
};

// The preview entry (`/__entry.tsx`) always does `import App from "/src/App"`.
// The bundler prefixes `src/` to any non-root file, so the entry is satisfied by
// a file at `src/App.{tsx,jsx,ts,js}` (or a bare `App.{tsx,jsx,ts,js}`).
const PREVIEW_ENTRY_RE = /^src\/App\.(tsx|jsx|ts|js)$/;
const hasPreviewEntryFile = (files: { path: string }[]): boolean =>
  files.some((f) => {
    let p = f.path.startsWith("/") ? f.path.slice(1) : f.path;
    if (p !== "package.json" && !p.startsWith("src/")) p = "src/" + p;
    return PREVIEW_ENTRY_RE.test(p);
  });

export const ProjectPreviewViewer = ({
  device = `desktop`,
  isMaximized = false,
  versionPreviewFiles,
  projectId,
  shareUrl,
  onDeviceChange,
  onToggleMaximize,
  isChatCollapsed,
  chatPosition = "left",
  isVersionHistory = false,
}: ProjectPreviewViewerProps) => {
  const { isInspectMode, addSelectedElement, setInspectMode } =
    useVisualEditorStore(
      useShallow((s) => ({
        isInspectMode: s.isInspectMode,
        addSelectedElement: s.addSelectedElement,
        setInspectMode: s.setInspectMode,
      })),
    );
  const { files: rawStoreFiles, updateFile } = useFilesStore(
    useShallow((s) => ({ files: s.files, updateFile: s.updateFile })),
  );
  const filesProjectId = useFilesStore((s) => s.filesProjectId);
  // The files store is global and shared across projects. On a project switch
  // this viewer is re-keyed and mounts *before* the previous effect's cleanup
  // clears the store, so for one commit `rawStoreFiles` still holds the
  // previous project's files — building them would show the wrong (stale)
  // preview until something happens to trigger a rebuild (hence the
  // "shows project A in project B until refresh" bug). Treat the store files as
  // empty whenever they are stamped for a *different* project; once the current
  // project's files land (stamp matches) or the store is cleared (stamp null)
  // they flow through normally.
  const storeFiles = useMemo(
    () =>
      filesProjectId !== null && filesProjectId !== projectId
        ? []
        : rawStoreFiles,
    [rawStoreFiles, filesProjectId, projectId],
  );
  const activeCodeSelection = useCodeSelectionStore(
    (s) => s.activeCodeSelection,
  );
  const activeCodeFiles = useCodeSelectionStore((s) => s.activeCodeFiles);
  const setActiveCodeSelection = useCodeSelectionStore(
    (s) => s.setActiveCodeSelection,
  );
  const apiKey = useAuthStore((s) => s.apiKey);
  const mobileProject = useMobileProjectStore((s) => s.mobileProject);
  const mobileProjectId = useMobileProjectStore((s) => s.mobileProjectId);
  const scopedMobileProject =
    mobileProjectId === projectId ? mobileProject : null;
  const [mobileSimulation, dispatchMobileSimulation] = useReducer(
    mobileSimulationReducer,
    INITIAL_MOBILE_SIMULATION_STATE,
  );

  useEffect(() => {
    dispatchMobileSimulation({ type: "reset" });
  }, [projectId]);

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

  // MCP project record — drives both the web-app preview mode (`project_type`)
  // and the screenshot backfill check (`project_image`). `/v1/mcp_project/*` is
  // a bearer-only endpoint, so the shared request interceptor attaches auth and
  // no headers are needed here.
  const { data: mcpProject } = useQuery({
    queryKey: ["mcp-project", projectId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/mcp_project/${projectId}`);
      return (data?.data ?? null) as {
        project_type?: ProjectType;
        project_image?: string | null;
        microfrontend_url?: string | null;
      } | null;
    },
    enabled: !!projectId,
  });

  // Whether this is a Capacitor mobile app. Declared early because the build
  // effect reads it (mobile skips the in-browser build until a valid local entry
  // exists). mcp_project.project_type is authoritative after reload; the SSE
  // `mobile_project` (scoped to this project) is the immediate signal during
  // generation.
  const isMobile =
    mcpProject?.project_type === "mobile" ||
    scopedMobileProject?.project_type === "mobile";

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
        repo_id?: string;
        url?: string;
      }>;
    },
    enabled: !!projectId,
    staleTime: 0,
  });

  // Warm up esbuild WASM on idle so the 13.5 MB file is fetched/compiled before
  // the user triggers the first build — otherwise runCode() pays the full cold
  // load and can hit the init timeout.
  useEffect(() => {
    const warm = () => void ensureEsbuild().catch(() => {});
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) {
      const id = ric(warm, { timeout: 3000 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = setTimeout(warm, 1500);
    return () => clearTimeout(t);
  }, []);

  // Fallback auto-select: chat-input has identical logic, but in production it
  // sometimes doesn't fire (chat-input isn't mounted yet, or apiKey arrives after
  // its query settles). Without a selection, isMicrofrontendLoading stays true
  // forever and the loader hangs. Run the same auto-select here as a safety net.
  const autoSelectAttemptedRef = useRef(false);
  useEffect(() => {
    if (autoSelectAttemptedRef.current) return;
    if (!projectId || !apiKey) return;
    if (!microfrontendsList.length) return;
    if (activeCodeSelection) return; // chat-input or processDoneData already set it

    autoSelectAttemptedRef.current = true;
    const targetMf = microfrontendsList[0];
    const target = {
      kind: "microfrontend" as const,
      id: targetMf.id,
      name: targetMf.name,
      path: targetMf.path,
      branch: targetMf.branch ?? "master",
      type: targetMf.type,
      repoId: targetMf.repo_id,
      url: targetMf.url,
      projectId: targetMf.project_id,
    };
    api
      .get(`/v2/function/${targetMf.id}/codebase`, {
        params: { "project-id": projectId },
        headers: { Authorization: "API-KEY", "x-api-key": apiKey },
      })
      .then(({ data }) => {
        const fetched = (data?.data?.files ?? []) as CodeSelectionFile[];
        setActiveCodeSelection(target, fetched);
      })
      .catch((err) => {
        console.error("[preview] auto-select codebase failed:", err);
        // Set selection without files so isMicrofrontendLoading flips to false
        // (empty array, not null) — preview will show a build error instead of spinning.
        setActiveCodeSelection(target, []);
      });
  }, [
    microfrontendsList,
    apiKey,
    projectId,
    activeCodeSelection,
    setActiveCodeSelection,
  ]);

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
    // Mobile (Capacitor): the microfrontend codebase can arrive without a
    // buildable entry (e.g. before it finishes loading), which fails the bundler
    // with "File not found: /src/App". The `mobile_project` SSE/response bundle
    // always carries the real source (src/App.tsx + Capacitor scaffold), so fall
    // back to it when the current base has no preview entry.
    if (
      !(versionPreviewFiles && versionPreviewFiles.length > 0) &&
      mobileProjectId === projectId &&
      mobileProject?.files?.length &&
      !hasPreviewEntryFile(base)
    ) {
      base = mobileProject.files.map((f) => ({
        path: f.path,
        content: f.content,
        language: getLanguageByPath(f.path),
      }));
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
    mobileProject,
    mobileProjectId,
    projectId,
  ]);

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
  // Background color sampled from the app's top edge. The phone frame tints its
  // top safe-area strip with this so the status-bar area reads as a continuous
  // extension of the app header instead of a separate band. Re-sampled on load.
  const [appTopBg, setAppTopBg] = useState<string | undefined>(undefined);
  // How much top safe-area the frame must add: the status-bar height minus the
  // clearance the app already reserves itself (so apps that handle their own
  // top space don't get a double gap). Re-measured on load.
  const [topInset, setTopInset] = useState<number>(PHONE_SAFE_AREA_TOP);
  // Bumped on explicit refresh to force iframe remount even when srcDoc is
  // byte-identical (deterministic build → unchanged string → no React re-render
  // → iframe wouldn't reload). Used as the iframe `key`.
  const [refreshKey, setRefreshKey] = useState(0);
  // Start in the loading state so the very first render shows the build loader
  // instead of a blank white iframe — the build effect runs right after mount
  // and either keeps this true (normal build) or flips it false (when a
  // microfrontend/stream loader takes over instead).
  const [isLoading, setIsLoading] = useState(true);
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
  const [themeSettings, setThemeSettings] = useState<{
    colors: Record<string, string>;
    logoUrl: string;
  }>(() => ({
    colors: {},
    logoUrl: "",
  }));
  // Groups derived from the CSS — only includes variables actually present in
  // the file (predefined shadcn vars in known order, plus a "Custom" group at
  // the end for anything else).
  const [colorGroups, setColorGroups] = useState<ColorGroup[]>([]);
  // Per-variable color format detected from the CSS file ('hex' or 'hsl').
  // Used to write each variable back in its original form. Keyed by cssVar name.
  const colorFormatsRef = useRef<Record<string, ColorFormat>>({});
  const [fontFamily, setFontFamily] = useState("Inter");
  // Snapshot of theme at the moment the popover opens — used to restore on Cancel
  const themeSnapshotRef = useRef<{
    colors: Record<string, string>;
    logoUrl: string;
    fontFamily: string;
  }>({
    colors: {},
    logoUrl: "",
    fontFamily: "Inter",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isBuilding = useRef(false);
  // Timer for the in-flight build; finalized when the iframe reports PREVIEW_READY.
  const buildTimerRef = useRef<BuildTimer | null>(null);

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
    colorFormatsRef.current = parsed.formats;
    setColorGroups(parsed.groups);
    setThemeSettings((prev) => ({
      ...prev,
      colors: parsed.colors,
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
    const formats = colorFormatsRef.current;
    for (const [cssVar, hex] of Object.entries(settings.colors)) {
      if (!hex) continue;
      root.style.setProperty(
        `--${cssVar}`,
        formatColorFromHex(hex, formats[cssVar] ?? "hex"),
      );
    }
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
    // Remove every var we may have set — formats ref is keyed by every var
    // discovered when last parsing the CSS, so it covers everything we injected.
    for (const cssVar of Object.keys(colorFormatsRef.current)) {
      root.style.removeProperty(`--${cssVar}`);
    }
    root.style.removeProperty("--font-body");
    const body = iframeRef.current?.contentDocument?.body;
    if (body) body.style.removeProperty("font-family");
  };

  // Read the effective background color at the app's top edge so the frame's
  // top safe-area strip can match it (keeps the header visually connected to
  // the top of the screen). Walks ancestors for the first opaque background,
  // falling back to body/html. Cross-origin/not-ready failures are ignored.
  const sampleAppTopBg = () => {
    try {
      const doc = iframeRef.current?.contentDocument;
      const win = iframeRef.current?.contentWindow;
      if (!doc || !win || !doc.body) return;
      const isOpaque = (c: string) =>
        !!c &&
        c !== "transparent" &&
        !c.replace(/\s/g, "").startsWith("rgba(0,0,0,0)");
      const w = doc.documentElement.clientWidth || 320;
      let el: Element | null = doc.elementFromPoint(Math.floor(w / 2), 2);
      let color = "";
      while (el) {
        const bg = win.getComputedStyle(el).backgroundColor;
        if (isOpaque(bg)) {
          color = bg;
          break;
        }
        el = el.parentElement;
      }
      if (!color) {
        const bodyBg = win.getComputedStyle(doc.body).backgroundColor;
        const htmlBg = win.getComputedStyle(
          doc.documentElement,
        ).backgroundColor;
        color = isOpaque(bodyBg) ? bodyBg : isOpaque(htmlBg) ? htmlBg : "";
      }
      if (color) setAppTopBg(color);

      // --- top content clearance: y of the highest text/media element, so we
      // only reserve the safe area the app is missing (avoids a double gap). ---
      const media = new Set([
        "SVG",
        "IMG",
        "INPUT",
        "BUTTON",
        "CANVAS",
        "VIDEO",
        "SELECT",
        "TEXTAREA",
      ]);
      const nodes = doc.body.querySelectorAll<HTMLElement>("*");
      let minTop = Infinity;
      for (let i = 0; i < nodes.length && minTop > 1; i++) {
        const node = nodes[i];
        if (!media.has(node.tagName.toUpperCase())) {
          let hasText = false;
          for (let j = 0; j < node.childNodes.length; j++) {
            const ch = node.childNodes[j];
            if (ch.nodeType === 3 && ch.textContent && ch.textContent.trim()) {
              hasText = true;
              break;
            }
          }
          if (!hasText) continue;
        }
        const r = node.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.top >= 0 && r.top < minTop) minTop = r.top;
      }
      const clearance = minTop === Infinity ? PHONE_SAFE_AREA_TOP : minTop;
      setTopInset(
        Math.max(
          0,
          Math.min(PHONE_SAFE_AREA_TOP, PHONE_SAFE_AREA_TOP - clearance),
        ),
      );
    } catch {
      // same-origin read failed or DOM not ready — keep the default strip color.
    }
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
      themeSnapshotRef.current = {
        colors: { ...themeSettings.colors },
        logoUrl: themeSettings.logoUrl,
        fontFamily,
      };
      themeSavePendingRef.current = false;
    } else if (!themeSavePendingRef.current) {
      // Closing without Save (outside click / Esc / Cancel) → revert to snapshot
      // so the effect clears inline overrides cleanly.
      const snap = themeSnapshotRef.current;
      setThemeSettings({
        colors: { ...snap.colors },
        logoUrl: snap.logoUrl,
      });
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
      themeSettings.colors,
      colorFormatsRef.current,
      fontFamily,
    );

    if (dirtyKey) {
      // Microfrontend: route through dirty store + auto-commit (like ElementStyleToolbar)
      const snap = themeSnapshotRef.current;
      const changed: string[] = [];
      for (const cssVar of Object.keys(themeSettings.colors)) {
        if (snap.colors[cssVar] !== themeSettings.colors[cssVar]) {
          changed.push(cssVar);
        }
      }
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

  const runCode = async (opts?: { force?: boolean }) => {
    // Mobile preview can render the published app without a local source entry.
    // Never send that incomplete source bundle to esbuild: its generated entry
    // imports `/src/App`, so doing so can only produce a misleading build error.
    if (isMobile && !hasPreviewEntryFile(files)) {
      setIsLoading(false);
      setRuntimeError((current) =>
        current?.isBuildError && current.message.includes("/src/App")
          ? null
          : current,
      );
      return;
    }
    if (isBuilding.current) return;
    // Hard guard: never build while a chat stream is open. Reads from the store
    // directly (not the closured `isStreaming` prop) so a stale closure from a
    // pending effect can't slip a build through after isStreaming flipped true.
    if (useChatStore.getState().isStreaming) {
      console.warn("[preview] runCode skipped — chat stream is open");
      return;
    }
    isBuilding.current = true;
    setIsLoading(true);
    setRuntimeError(null);

    const selectionKind = activeCodeSelection?.kind;
    const selectionId =
      activeCodeSelection && "id" in activeCodeSelection
        ? (activeCodeSelection as { id?: string }).id
        : undefined;
    const cacheKey = makeBuildCacheKey({
      projectId,
      selectionKind,
      selectionId,
      contentHash: `${PREVIEW_RUNTIME_VERSION}:${hashFiles(files)}`,
    });

    // Mutable so the cache fast-path can flip cacheHit before the timer logs
    // (createBuildTimer keeps this object by reference).
    const buildMeta: Record<string, unknown> = {
      projectId,
      selection: selectionKind ?? "frontend",
      files: files.length,
      cacheHit: false,
    };
    const timer = createBuildTimer(buildMeta);
    buildTimerRef.current = timer;

    let builtHtml: string | null = null;

    // ── Cache fast-path ──
    // Deterministic build → identical inputs reuse the previous srcDoc and skip
    // esbuild entirely (undo/redo, tab away & back, no-op rebuilds). Manual
    // Refresh (force) always bypasses so the user gets a genuine fresh build.
    if (!opts?.force && previewOptimizationsEnabled()) {
      const cached = getCachedBuild(cacheKey);
      if (cached) {
        timer.mark("cache-hit");
        buildMeta.cacheHit = true;
        builtHtml = cached;
        // Only touch srcDoc when it actually differs — an identical string is
        // already on screen, so re-setting it would needlessly remount the
        // iframe and re-run the esm.sh waterfall.
        if (cached !== srcDoc) setSrcDoc(cached);
        timer.markSrcDocSet();
        setIsLoading(false);
        isBuilding.current = false;
      }
    }

    const build = async () => {
      await timer.measure("esbuild-init", () => ensureEsbuild());
      const { code, dependencies } = await timer.measure("bundle", () =>
        buildProjectFromFiles(files, {
          VITE_API_BASE_URL: "http://localhost:3000",
          VITE_API_KEY: "",
          VITE_X_API_KEY: "",
          VITE_MAP_TILE_URL:
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          VITE_APP_NAME: "App",
          NODE_ENV: "development",
        }),
      );
      const html = await timer.measure("generate-html", () =>
        generatePreviewHtml(code, dependencies, files),
      );
      builtHtml = html;
      // Cache only successful builds (this line is unreachable on error).
      setCachedBuild(cacheKey, html);
      setSrcDoc(html);
      timer.markSrcDocSet();
    };

    if (!builtHtml) {
      // Cold builds pay the full 13 MB WASM download; warm builds (esbuild
      // already initialized) only re-bundle. Give cold a much larger budget so a
      // slow network doesn't trip a false timeout. Keep INIT_TIMEOUT_MS in
      // bundler.ts >= the cold budget here.
      const warm =
        (window as { __ESBUILD_READY__?: boolean }).__ESBUILD_READY__ === true;
      const timeoutMs = warm ? 30_000 : 90_000;
      try {
        // Safety timeout — in production esbuild WASM can hang silently if
        // blocked by CSP or a flaky CDN. Without this race, the await would
        // never settle and the loader would spin forever.
        await Promise.race([
          build(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `Preview build timed out after ${timeoutMs / 1000}s — esbuild may have failed to load.`,
                  ),
                ),
              timeoutMs,
            ),
          ),
        ]);
      } catch (err: any) {
        const errorMessage = err.message || "Unknown build error";
        console.error("[preview] build failed:", err);
        timer.report();
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
    }

    // Fallback finalize: the build (JS) half is done, but the iframe normally
    // finalizes the timer when it posts PREVIEW_READY. If that never arrives
    // (runtime error, identical-srcDoc cache hit with no remount), log the build
    // half after a grace period. report() is idempotent.
    if (builtHtml) {
      setTimeout(() => timer.report(), 15_000);
    }

    // Capture the screenshot once the post-SSE build settles. The pending flag
    // lives in the chat store (not a ref) because the preview viewer remounts
    // mid-flow when `setActiveCodeSelection(_, null)` briefly flips `hasNoFiles`
    // to true — a local ref would be wiped between unmount and remount.
    const { pendingScreenshot, setPendingScreenshot } = useChatStore.getState();
    if (pendingScreenshot && builtHtml) {
      setPendingScreenshot(false);
      captureAndUploadScreenshot(builtHtml);
    } else if (needsScreenshotRef.current && builtHtml) {
      // Backfill: the project built cleanly (builtHtml is only set on a
      // successful build — the catch branch leaves it null) but had no saved
      // screenshot. Capture once; the upload then sets project_image so this
      // won't fire again on later rebuilds.
      needsScreenshotRef.current = false;
      captureAndUploadScreenshot(builtHtml);
    }
  };

  const handleRefresh = () => {
    isBuilding.current = false;
    setRuntimeError(null);
    setCurrentUrl("/");
    setUrlInput("/");
    // Force iframe remount — the build is deterministic, so without this the
    // srcDoc string stays identical and React skips the iframe re-render.
    setRefreshKey((k) => k + 1);
    // force: skip the result cache so Refresh always rebuilds from scratch.
    runCode({ force: true });
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

  // `files` can land in more than one store update — e.g. a microfrontend
  // project first exposes only scaffolding from `project_files`, then the real
  // codebase (including src/App) arrives later when the codebase is fetched.
  // Building in that gap throws a spurious "File not found: /src/App" that
  // self-heals on the next rebuild. Track entry readiness so the build effect
  // can wait it out.
  const hasPreviewEntry = useMemo(() => hasPreviewEntryFile(files), [files]);

  // Wait for the SSE to fully close before building — `chunk_done`/`done` events
  // arrive mid-stream and would otherwise trigger premature rebuilds.
  const isStreaming = useChatStore((s) => s.isStreaming);

  // First build runs immediately so the preview shows as fast as possible on
  // open/refresh; later rebuilds stay debounced to coalesce rapid file changes.
  const hasBuiltRef = useRef(false);

  // Safety net for projects that have a buildable codebase but no saved
  // screenshot yet (e.g. generated before screenshots existed, or whose initial
  // capture never fired). When true, the next successful build captures one even
  // without a `pendingScreenshot` flag. Guarded by `screenshotCheckedRef` so the
  // mcp_project lookup runs once per project.
  const needsScreenshotRef = useRef(false);
  const screenshotCheckedRef = useRef(false);
  useEffect(() => {
    if (!projectId) return;
    // Don't backfill while browsing version history — those files aren't the
    // project's current state.
    if (
      isVersionHistory ||
      (versionPreviewFiles && versionPreviewFiles.length > 0)
    )
      return;
    if (screenshotCheckedRef.current) return;
    // Wait for the shared mcp_project query before deciding — reusing it avoids
    // a second GET to the same endpoint.
    if (!mcpProject) return;
    screenshotCheckedRef.current = true;
    if (!mcpProject.project_image) {
      needsScreenshotRef.current = true;
      console.log(
        "[preview screenshot] no existing project_image — will capture on next successful build",
      );
    }
  }, [projectId, isVersionHistory, versionPreviewFiles, mcpProject]);

  useEffect(() => {
    // Skip while microfrontend codebase is still loading or chat is streaming —
    // those states have their own loaders. Don't leave "Building preview" hanging
    // when no build is actually scheduled.
    //
    // A mobile project can also use its published URL without a local src/App
    // entry. In that state, do not schedule the no-entry safety-valve build:
    // it would fail by design and replace the valid mobile fallback with an
    // irrelevant `/src/App` error.
    if (
      isMicrofrontendLoading ||
      isStreaming ||
      (isMobile && !hasPreviewEntry)
    ) {
      setIsLoading(false);
      if (isMobile && !hasPreviewEntry) {
        setRuntimeError((current) =>
          current?.isBuildError && current.message.includes("/src/App")
            ? null
            : current,
        );
      }
      return;
    }
    setIsLoading(true);

    // Entry present → first build runs immediately for speed, later ones stay
    // debounced. Entry not here yet → hold off; if filesHash changes (the entry
    // lands) the effect re-runs and builds then. As a safety valve, still build
    // after a grace period so a genuinely broken project surfaces its real
    // error instead of spinning forever.
    if (hasPreviewEntry && !hasBuiltRef.current) {
      hasBuiltRef.current = true;
      runCode();
      return;
    }
    const delay = hasPreviewEntry ? 1000 : 8000;
    const timeout = setTimeout(() => {
      hasBuiltRef.current = true;
      runCode();
    }, delay);
    return () => clearTimeout(timeout);
  }, [
    filesHash,
    hasPreviewEntry,
    isMicrofrontendLoading,
    isStreaming,
    isMobile,
  ]);

  const captureAndUploadScreenshot = async (html: string) => {
    console.log("[preview screenshot] capture started");
    if (!html) {
      console.warn("[preview screenshot] no html — aborting");
      return;
    }
    // Mount an off-screen iframe at full desktop size so the screenshot isn't
    // constrained by the visible preview panel. The user never sees it.
    const hidden = document.createElement("iframe");
    hidden.style.position = "fixed";
    hidden.style.left = "-10000px";
    hidden.style.top = "0";
    hidden.style.width = "1440px";
    hidden.style.height = "900px";
    hidden.style.border = "none";
    hidden.style.pointerEvents = "none";
    hidden.setAttribute(
      "sandbox",
      "allow-scripts allow-same-origin allow-forms allow-modals",
    );
    hidden.srcdoc = html;
    document.body.appendChild(hidden);
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("hidden iframe load timed out")),
          15_000,
        );
        hidden.onload = () => {
          clearTimeout(timer);
          resolve();
        };
      });
      await new Promise((r) => setTimeout(r, 5000));
      const target = hidden.contentDocument?.body;
      if (!target) {
        console.warn("[preview screenshot] no hidden body — aborting");
        return;
      }
      const dataUrl = await toPng(target, {
        cacheBust: true,
        pixelRatio: 1,
        skipFonts: true,
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `preview-${Date.now()}.png`, {
        type: "image/png",
      });
      const formData = new FormData();
      formData.append("file", file);
      const result = await fileService.folderUpload(formData, {
        folder_name: projectId || "preview-screenshots",
      });
      const cdn =
        process.env.NEXT_PUBLIC_CDN_BASE_URL || "https://cdn.u-code.io";
      const link = result?.data?.link;
      const url = link ? `${cdn}/${link}` : null;
      console.log("[preview screenshot] uploaded:", url, result);
      if (url && projectId) {
        try {
          await api.put(`/v1/mcp_project/${projectId}`, {
            project_image: url,
            project_id: projectId,
          });
          console.log(
            "[preview screenshot] mcp_project updated with project_image",
          );
        } catch (putErr) {
          console.error(
            "[preview screenshot] mcp_project update failed:",
            putErr,
          );
        }
      }
    } catch (err) {
      console.error("[preview screenshot] failed:", err);
    } finally {
      hidden.remove();
    }
  };

  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "UCODE_PREVIEW_CONTEXT", trusted: true, source: "ugen-preview" },
        "*",
      );
      iframeRef.current.contentWindow.postMessage(
        { type: isInspectMode ? "INSPECT_ON" : "INSPECT_OFF" },
        "*",
      );
    }
  }, [isInspectMode, srcDoc]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      // Only trust messages coming from THIS viewer's preview iframe. The hidden
      // screenshot iframe and any iframe left over from a project you just
      // navigated away from also post to `window.parent` — without this guard a
      // build/runtime error from the previous project surfaces in the new one.
      if (e.source !== iframeRef.current?.contentWindow) return;

      if (e.data?.type === "PREVIEW_READY") {
        // Preview revealed → finalize the build timer with the runtime half.
        buildTimerRef.current?.reportVisible();
        return;
      }

      if (e.data?.type === "ROUTE_CHANGE") {
        const url = e.data.url || "/";
        setCurrentUrl(url);
        setUrlInput(url);
        return;
      }

      if (e.data?.type === "PREVIEW_RUNTIME_ERROR") {
        const nextError = {
          message: e.data.message,
          stack: e.data.stack,
          filename: e.data.filename,
          lineno: e.data.lineno,
          colno: e.data.colno,
        };
        setRuntimeError((current) => {
          if (
            current?.message === nextError.message &&
            current?.filename === nextError.filename &&
            current?.lineno === nextError.lineno &&
            current?.colno === nextError.colno
          ) {
            return current;
          }
          return nextError;
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

  // Only a mobile-first web app (`project_type === "webapp"`) renders inside the
  // phone frame; every other type — admin_panel / web / landing — and an
  // unknown/missing value fall back to the full-width desktop preview.
  const isWebApp = mcpProject?.project_type === "webapp";

  // Web-app preview mode: render the live preview inside a phone frame next to
  // the "preview on your phone" QR panel — always for a previewable web app,
  // independent of the device picker. Skipped for functions, full-screen, and
  // version-history views (which keep the plain browser card).
  const webAppMode =
    isWebApp &&
    !isFunction &&
    hasPreviewEntry &&
    !isMaximized &&
    !isVersionHistory;

  // Capacitor mobile app (`project_type === "mobile"`). It's the web build wrapped
  // in a native shell, so it reuses the exact same live preview inside the phone
  // frame — but with a mobile actions panel (Preview / Download source / native
  // builds) instead of the "preview on your phone" QR panel. `mobileProject` from
  // the SSE event is an immediate signal before the mcp_project record refetches.
  // No hasPreviewEntry gate — mobile renders the published app in an iframe, not
  // the in-browser build, so a local bundler entry isn't required. (`isMobile` is
  // declared earlier, alongside the mcp_project query.)
  const mobileMode =
    isMobile && !isFunction && !isMaximized && !isVersionHistory;

  // Published web preview URL for the mobile "test on phone" QR. The backend
  // stores it scheme-less, so normalize to an absolute https URL before encoding.
  const mobilePreviewUrl = (() => {
    const raw = mcpProject?.microfrontend_url || shareUrl || "";
    if (!raw) return "";
    return raw.startsWith("http") ? raw : `https://${raw}`;
  })();

  // Status-bar (clock/icons) color: dark on light app backgrounds, light on
  // dark ones, so it stays readable whatever theme the generated app uses.
  const statusBarColor = (() => {
    const m = appTopBg?.match(/rgba?\(([^)]+)\)/);
    if (!m) return "#ECECEF";
    const [r, g, b] = m[1].split(",").map((s) => parseFloat(s));
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma > 150 ? "#1c1c1e" : "#ECECEF";
  })();

  // Shared browser header JSX (rendered inside the card)
  const browserHeader = (
    <div className="border-border-subtle bg-bg-card flex h-10 shrink-0 items-center justify-between gap-2 border-b px-2">
      {/* Left: Microfrontend Picker + Visual Edit + Theme */}
      <div className="flex shrink-0 items-center gap-1.5">
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
            <PopoverContent align="start" sideOffset={6} className="w-44 p-1">
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
          <ThemePopover
            open={themeOpen}
            onOpenChange={handleThemeOpenChange}
            colorGroups={colorGroups}
            themeSettings={themeSettings}
            setThemeSettings={setThemeSettings}
            fontFamily={fontFamily}
            setFontFamily={setFontFamily}
            onCancel={handleCancelTheme}
            onSave={handleSaveTheme}
          />
        )}
      </div>

      {/* Right: Save (when dirty) + Rebuild + Device Picker + Fullscreen */}
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
        {!isVersionHistory && (
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            title="Rebuild preview"
            className="text-text-muted hover:bg-hover-bg hover:text-text-main flex h-7 w-7 items-center justify-center rounded-lg transition-colors disabled:opacity-50"
          >
            <RotateCcw size={13} className={cn(isLoading && "animate-spin")} />
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

  // Loading overlays + the live preview iframe. Shared between the plain
  // browser card and the phone-framed web-app view so the build/error/iframe
  // behaviour stays identical in both.
  const previewSurface = (
    <>
      {/* Microfrontend loading overlay (takes priority) */}
      {(!!loadingPreviewId || isMicrofrontendLoading) && (
        <WorkspaceLoader
          message="Loading microfrontend..."
          subMessage="Fetching codebase"
        />
      )}
      {/* Streaming pre-build overlay — the build effect waits for SSE to
          close before building, so when storeFiles populates mid-stream
          (and this viewer mounts to replace ProjectBuildingAnimation in
          the parent), the iframe would otherwise sit on its default
          white background until the post-stream build lands. */}
      {isStreaming &&
        !srcDoc &&
        !runtimeError &&
        !loadingPreviewId &&
        !isMicrofrontendLoading && (
          <WorkspaceLoader
            message="Generating preview..."
            subMessage="Waiting for AI to finish"
          />
        )}
      {/* Build loading overlay — hidden when an error is shown */}
      {isLoading &&
        !runtimeError &&
        !loadingPreviewId &&
        !isMicrofrontendLoading && (
          <WorkspaceLoader
            message="Building preview..."
            subMessage="Running esbuild"
          />
        )}
      <iframe
        key={refreshKey}
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
          // Tint the frame's top safe-area strip to the app's top color (after
          // first paint) so the header stays visually connected to the top.
          requestAnimationFrame(() => requestAnimationFrame(sampleAppTopBg));
        }}
      />
    </>
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "bg-bg-main relative flex flex-1 flex-col overflow-hidden",
        isInspectMode && "cursor-crosshair",
      )}
    >
      {/* Desktop/web errors stay blocking. Mobile errors use a compact banner
          below so the phone frame and actions never become inaccessible. */}
      {runtimeError && !mobileMode && (
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
      ) : mobileMode ? (
        /* Mobile (Capacitor) preview. Capacitor wraps the exact same web build as
           the webapp type, so the phone frame uses the SAME in-browser live build
           (works unpublished, instant) as its primary path. The published app
           (microfrontend_url) is only a fallback — used when there's no buildable
           source or the in-browser build fails. The mobile actions panel sits
           beside it. */
        <div
          className={cn(
            "flex h-full flex-1 flex-col overflow-hidden transition-all duration-300",
            chatPosition === "left"
              ? isChatCollapsed
                ? "px-4"
                : "pr-4 pl-0"
              : isChatCollapsed
                ? "px-4"
                : "pr-0 pl-4",
          )}
        >
          {browserHeader}
          {runtimeError && (
            <div className="border-border-subtle bg-bg-card mx-4 mt-2 flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2 shadow-sm">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="text-text-main text-xs font-medium">
                  Mobile preview reported an error
                </p>
                <p
                  className="text-text-muted truncate text-[11px]"
                  title={runtimeError.message}
                >
                  {runtimeError.message}
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh preview"
                className="text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
              >
                <RotateCcw size={13} />
              </button>
              <button
                type="button"
                onClick={handleFixInChat}
                className="bg-primary hover:bg-primary/90 shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors"
              >
                Fix in chat
              </button>
              <button
                type="button"
                onClick={() => setRuntimeError(null)}
                title="Dismiss error"
                className="text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors"
              >
                <X size={13} />
              </button>
            </div>
          )}
          <div className="flex min-h-0 flex-1 items-stretch justify-center gap-6 overflow-hidden py-2">
            {/* Phone frame (Claude Design PhoneShell). Primary: the in-browser
                live build (same as webapp, no publish needed). Fallback: the
                published app URL in an iframe when there's no buildable source or
                the build errored. */}
            <div className="flex min-h-0 flex-1 items-stretch justify-center">
              <PhoneShell
                screenBg={appTopBg}
                safeTop={topInset}
                statusColor={statusBarColor}
              >
                <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
                  {hasPreviewEntry ? (
                    previewSurface
                  ) : mobilePreviewUrl ? (
                    <iframe
                      src={mobilePreviewUrl}
                      title="Mobile preview"
                      className="h-full w-full flex-1 border-none bg-white"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
                    />
                  ) : (
                    <WorkspaceLoader
                      message="Preparing mobile preview…"
                      subMessage="Building your app"
                    />
                  )}
                  <MobileCapabilitySimulation
                    state={mobileSimulation}
                    dispatch={dispatchMobileSimulation}
                    projectName={scopedMobileProject?.project_name}
                  />
                </div>
              </PhoneShell>
            </div>
            <MobileActionsPanel
              mobileProject={scopedMobileProject}
              files={files}
              webPreviewUrl={mobilePreviewUrl}
              onSimulateCapability={(capability) =>
                dispatchMobileSimulation({ type: "open", capability })
              }
              onPreview={() => {
                if (mobilePreviewUrl)
                  window.open(
                    mobilePreviewUrl,
                    "_blank",
                    "noopener,noreferrer",
                  );
              }}
              className="max-h-full self-start"
            />
          </div>
        </div>
      ) : webAppMode ? (
        /* Web-app preview — live preview inside a phone frame + QR panel */
        <div
          className={cn(
            "flex h-full flex-1 flex-col overflow-hidden transition-all duration-300",
            chatPosition === "left"
              ? isChatCollapsed
                ? "px-4"
                : "pr-4 pl-0"
              : isChatCollapsed
                ? "px-4"
                : "pr-0 pl-4",
          )}
        >
          {browserHeader}
          <div className="flex min-h-0 flex-1 items-stretch justify-center gap-6 overflow-hidden py-2">
            {/* Phone frame holding the live preview (Claude Design PhoneShell) */}
            <div className="flex min-h-0 flex-1 items-stretch justify-center">
              <PhoneShell
                screenBg={appTopBg}
                safeTop={topInset}
                statusColor={statusBarColor}
              >
                {previewSurface}
              </PhoneShell>
            </div>
            <MobilePreviewPanel
              shareUrl={shareUrl}
              className="max-h-full self-start"
            />
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
            {previewSurface}
          </div>
        </div>
      )}
    </div>
  );
};
