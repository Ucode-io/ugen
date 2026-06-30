import * as esbuild from "esbuild-wasm"
import { virtualFsPlugin, createPluginStats, type PluginStats } from "./esbuildPlugin"
import { previewOptimizationsEnabled } from "./preview-flags"

// Hosted locally in /public — esm.sh hangs/blocks in some prod environments
// (CSP, corp proxies). The file is copied at install time; see the `postinstall`
// script in package.json. The `?v=<version>` query busts the browser cache on
// upgrade while letting us serve the file `immutable` (see next.config.ts headers).
export const WASM_URL = `/esbuild.wasm?v=${esbuild.version}`;

// 13.5 MB WASM на холодную (cache miss + медленная сеть) может качаться дольше
// прежних 15с. Даём больше времени, но НЕ ретраим повторным initialize() —
// см. ниже. Держим в синхроне с cold-бюджетом гонки в runCode
// (project-preview-viewer.tsx): если init проиграет гонку первым, превью
// упадёт по ложному таймауту до того, как WASM реально докачается.
const INIT_TIMEOUT_MS = 90_000;

// ── Build dispatch: dedicated worker vs legacy main-thread ─────────────────
// Default (optimizations ON): build inside a dedicated worker that hosts esbuild
// with worker:false, so the virtual-FS plugin's onResolve/onLoad callbacks are
// in-realm calls instead of per-edge worker↔main postMessage round-trips. The
// legacy path (esbuild.initialize({worker:true}) on the main thread) stays as the
// fallback — used when the kill-switch is OFF (A/B baseline) or when the worker
// fails to boot (bundling/CSP). Output is byte-identical between the two.
function workerBuildEnabled(): boolean {
  if (!previewOptimizationsEnabled()) return false;
  if (typeof window === "undefined" || typeof Worker === "undefined") return false;
  // Set once if the worker ever fails — pin this session to the main-thread path.
  if ((window as any).__PREVIEW_WORKER_DISABLED__) return false;
  return true;
}

function markWorkerDisabled() {
  if (typeof window !== "undefined") (window as any).__PREVIEW_WORKER_DISABLED__ = true;
}

// ── Shared build input ─────────────────────────────────────────────────────
// Everything esbuild needs, computed on the main thread (where localStorage /
// the optimization flag live) and either passed to the worker or fed to the
// main-thread esbuild.build. Pure string/JSON data → safe to structured-clone.
export interface BuildInput {
  fs: Record<string, string>;
  entryPoint: string;
  external: string[];
  define: Record<string, string>;
  jsxDev: boolean;
  externalDepsMap: Record<string, string>;
}

function makeBuildInput(files: any[], env: any = {}): BuildInput {
  const fs: Record<string, string> = {};
  let externalDepsMap: Record<string, string> = {};

  const pkgFile = files.find((f: any) => f.path.includes("package.json"));
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content);
      externalDepsMap = pkg.dependencies || {};
    } catch (e) {
      console.error("Error parsing package.json", e);
    }
  }

  // Parse .env and .env.example for env variables
  const envFiles = files.filter((f: any) => f.path.endsWith(".env") || f.path.endsWith(".env.example"));

  // Sort so .env.example comes first, and .env overrides it
  envFiles.sort((a, b) => b.path.length - a.path.length);

  for (const file of envFiles) {
    // Use ?. to safely access split, or ?? "" to provide a fallback
    file.content?.split("\n").forEach((line: string) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const [key, ...rest] = trimmed.split("=");
      if (key?.startsWith("VITE_")) {
        env[key.trim()] = rest.join("=").trim();
      }
    });
  }

  const defaultExternals = [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "react-dom/client",
    "react-router-dom",
    "react-dom/server",
    "axios",
    "lucide-react",
  ];

  const allExternals = [...new Set([...Object.keys(externalDepsMap), ...defaultExternals])];

  const ROOT_LEVEL_FILES = new Set(["package.json"]);
  const SKIP_FILES = new Set([
    "tailwind.config.js",
    "postcss.config.js",
    "vite.config.ts",
    "tsconfig.json",
    "tsconfig.node.json",
    "components.json",
    "README.md",
    ".env.example",
    ".gitignore",
    "template.manifest.json",
    "index.html",
  ]);

  for (const file of files) {
    let path = file.path.startsWith("/") ? file.path.slice(1) : file.path;

    if (SKIP_FILES.has(path)) continue;

    if (!ROOT_LEVEL_FILES.has(path) && !path.startsWith("src/")) {
      path = "src/" + path;
    }

    path = "/" + path;

    let content = file.content;

    // BrowserRouter can't drive routing inside an `about:srcdoc` iframe (opaque
    // origin, bogus location, pushState SecurityError) — swap it for MemoryRouter.
    // Match both `react-router-dom` (v6) and bare `react-router` (v7), where apps
    // import `BrowserRouter` straight from the core package.
    if (content?.includes("react-router") && content?.includes("BrowserRouter")) {
      console.log(`[Bundler] Patching BrowserRouter to MemoryRouter in ${path}`);
      content = content.replace(/BrowserRouter/g, "MemoryRouter");
    }

    fs[path] = content;
  }

  // ── Auto-generate shim re-export files for common UI component aliases ──
  // Templates often import from individual paths like '@/components/ui/label'
  // but the actual components live in aggregate files (misc.tsx, primitives.tsx).
  // We generate shim files only if the target file doesn't already exist.
  const shimFiles: Record<string, string> = {
    // Components from misc.tsx
    "/src/components/ui/label.tsx": `export { Label } from './misc';`,
    "/src/components/ui/badge.tsx": `export { Badge, badgeVariants } from './misc';`,
    "/src/components/ui/separator.tsx": `export { Separator } from './misc';`,
    // Components from primitives.tsx
    "/src/components/ui/tabs.tsx": `export { Tabs, TabsList, TabsTrigger, TabsContent } from './primitives';`,
    "/src/components/ui/scroll-area.tsx": `export { ScrollArea } from './primitives';`,
    "/src/components/ui/avatar.tsx": `export { Avatar, AvatarImage, AvatarFallback } from './primitives';`,
    "/src/components/ui/tooltip.tsx": `export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './primitives';`,
  };

  // Resolve a logical path against the virtual FS, trying extensions and
  // /index variants — mirrors the esbuild plugin's resolver so the shim guard
  // agrees with how imports actually resolve at build time.
  const SHIM_EXTS = [".tsx", ".ts", ".jsx", ".js", "", ".css", ".json", ".svg"];
  const resolvesInFs = (logicalPath: string): boolean => {
    for (const ext of SHIM_EXTS) if (fs[logicalPath + ext] != null) return true;
    for (const ext of SHIM_EXTS) if (fs[logicalPath + "/index" + ext] != null) return true;
    return false;
  };

  for (const [shimPath, shimContent] of Object.entries(shimFiles)) {
    // Skip if the component already resolves (a real file OR a directory-index
    // like `tabs/index.tsx`) — a shim would otherwise shadow the real component.
    const logical = shimPath.replace(/\.tsx$/, "");
    if (resolvesInFs(logical)) continue;

    // Skip if the shim's re-export target (e.g. './primitives', './misc') isn't
    // present in this template — otherwise the shim just fails the build itself.
    const targetMatch = shimContent.match(/from\s+['"]\.\/([^'"]+)['"]/);
    const dir = shimPath.slice(0, shimPath.lastIndexOf("/"));
    if (targetMatch && !resolvesInFs(`${dir}/${targetMatch[1]}`)) continue;

    fs[shimPath] = shimContent;
  }

  // ── Pick the entry point ──
  // Prefer the project's REAL entry — the module that mounts React (createRoot/
  // ReactDOM.render). Real Vite apps put their provider tree (Router, Theme,
  // Helmet, QueryClient, …) in src/main.tsx and render <App/> from there; rendering
  // a bare <App/> drops those providers, so the first page throws on a missing
  // context (useTheme, <Helmet>, …) and the preview goes blank.
  // Templates may ship a dedicated ugen-preview entry for a faster in-browser
  // preview without changing their production Vite entry.
  const ENTRY_CANDIDATES = [
    "/src/ugen-preview.tsx",
    "/src/ugen-preview.jsx",
    "/src/preview.tsx",
    "/src/preview.jsx",
    "/src/main.tsx",
    "/src/main.jsx",
    "/src/main.ts",
    "/src/main.js",
    "/src/index.tsx",
    "/src/index.jsx",
  ];
  const MOUNTS_REACT = /\b(?:createRoot|hydrateRoot)\s*\(|ReactDOM\.render\s*\(/;
  let entryPoint =
    ENTRY_CANDIDATES.find(
      (p) => typeof fs[p] === "string" && MOUNTS_REACT.test(fs[p]),
    ) ??
    Object.keys(fs).find(
      (p) => /\.(tsx|jsx|ts|js)$/.test(p) && MOUNTS_REACT.test(fs[p]),
    ) ??
    null;

  if (!entryPoint) {
    fs["/__entry.tsx"] = `
      import App from "/src/App";
      import { createRoot } from "react-dom/client";
      import React from "react";

      const container = document.getElementById("root");
      if (!container) throw new Error("Root element not found");

      if (!window.__react_root__) {
        window.__react_root__ = createRoot(container);
      }

      try {
        window.__react_root__.render(React.createElement(App));
      } catch (e) {
        console.error(e);
      }
    `;
    entryPoint = "/__entry.tsx";
  }

  const define: Record<string, string> = {
    "process.env.NODE_ENV": '"development"',
    // Define import.meta.env as a FULL object so both static
    // (import.meta.env.VITE_X) and dynamic (import.meta.env[key]) access work.
    "import.meta.env": JSON.stringify({
      DEV: true,
      PROD: false,
      MODE: "development",
      BASE_URL: "",
      SSR: false,
      ...env,
    }),
  };

  return {
    fs,
    entryPoint,
    external: allExternals,
    define,
    // Production JSX runtime (react/jsx-runtime), not jsx-dev-runtime. The dev
    // runtime pulls react.development from esm.sh as a SECOND React graph
    // alongside react-dom's production react.mjs — an extra large request plus a
    // dual-React hazard ("Invalid hook call"). The preview surfaces errors via
    // window.onerror, not React's dev warnings, so we lose nothing here.
    // Gated so the build-timer can A/B against the old dev runtime (see preview-flags).
    jsxDev: !previewOptimizationsEnabled(),
    externalDepsMap,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Worker path (default)
// ════════════════════════════════════════════════════════════════════════════
const WORKER_KEY = "__PREVIEW_BUILD_WORKER__";
interface PendingReq {
  resolve: (v: any) => void;
  reject: (e: any) => void;
}
interface WorkerState {
  worker: Worker;
  pending: Map<number, PendingReq>;
  initPromise: Promise<void> | null;
}
let reqSeq = 0;

// One worker per page, stashed on window so it survives HMR and re-imports of
// this module from different chunks. Throws if the bundler can't create the
// worker (caller catches and falls back to the main-thread path).
function getWorkerState(): WorkerState {
  const w = window as any;
  if (w[WORKER_KEY]) return w[WORKER_KEY] as WorkerState;

  const worker = new Worker(
    new URL("./preview-build.worker.ts", import.meta.url),
    { type: "module" },
  );
  const pending = new Map<number, PendingReq>();

  worker.onmessage = (e: MessageEvent) => {
    const msg = e.data;
    const p = pending.get(msg.id);
    if (!p) return;
    pending.delete(msg.id);
    if (msg.type === "build-error") {
      // Legitimate build/user-code error — reject, but tag it so the caller
      // surfaces it without disabling the (healthy) worker.
      const err = new Error(msg.error);
      (err as any).isPreviewBuildError = true;
      p.reject(err);
    } else if (msg.type === "error") {
      p.reject(new Error(msg.error));
    } else {
      p.resolve(msg);
    }
  };
  // A fatal worker-level error (script failed to load/parse, e.g. CSP). Reject
  // everything in flight and disable the worker path for the session.
  worker.onerror = () => {
    for (const [, p] of pending) p.reject(new Error("preview build worker crashed"));
    pending.clear();
    markWorkerDisabled();
    w[WORKER_KEY] = null;
  };

  const state: WorkerState = { worker, pending, initPromise: null };
  w[WORKER_KEY] = state;
  return state;
}

function callWorker(type: "init" | "build", extra: Record<string, unknown>): Promise<any> {
  const state = getWorkerState();
  const id = ++reqSeq;
  return new Promise((resolve, reject) => {
    state.pending.set(id, { resolve, reject });
    state.worker.postMessage({ id, type, wasmURL: WASM_URL, ...extra });
  });
}

function ensureWorkerInit(): Promise<void> {
  const state = getWorkerState();
  if (!state.initPromise) {
    const init = callWorker("init", {}).then(() => {
      // Keep the warm/cold flag that runCode reads to size its build timeout.
      (window as any).__ESBUILD_READY__ = true;
    });
    // UI safety: if the WASM never loads (CSP/CDN), don't hang the loader forever.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () =>
          reject(
            new Error(
              `preview worker esbuild init timed out (${INIT_TIMEOUT_MS / 1000}s) — couldn't load ${WASM_URL}`,
            ),
          ),
        INIT_TIMEOUT_MS,
      ),
    );
    state.initPromise = Promise.race([init, timeout]);
  }
  return state.initPromise;
}

async function buildViaWorker(input: BuildInput): Promise<{ code: string; stats?: PluginStats }> {
  await ensureWorkerInit();
  const res = await callWorker("build", {
    payload: {
      fs: input.fs,
      entryPoint: input.entryPoint,
      external: input.external,
      define: input.define,
      jsxDev: input.jsxDev,
    },
  });
  return { code: res.code, stats: res.stats };
}

// ════════════════════════════════════════════════════════════════════════════
// Legacy main-thread path (kill-switch OFF, or worker fallback)
// ════════════════════════════════════════════════════════════════════════════
// esbuild.initialize() можно вызвать ровно ОДИН раз за жизнь страницы. Повторный
// вызов всегда кидает 'Cannot call "initialize" more than once' — поэтому любые
// "ретраи" должны переиспользовать тот же самый промис, а не звать initialize
// заново. Промис кладём на window, чтобы он пережил HMR и повторные импорты
// модуля (разные чанки могут получить свою копию bundler.ts).
const INIT_KEY = "__ESBUILD_INIT_PROMISE__";

function isAlreadyInitialized(err: unknown) {
  const msg = (err as Error)?.message ?? "";
  // 'Cannot call "initialize" more than once' означает, что initialize уже был
  // вызван где-то ещё (другая копия модуля / гонка) — это не ошибка для нас.
  return msg.includes("Cannot call") || msg.includes("more than once") || msg.includes("already");
}

// Единственный на всю страницу вызов esbuild.initialize(). Все последующие
// обращения переиспользуют этот промис.
function getInitPromise(): Promise<void> {
  const w = window as any;
  if (w[INIT_KEY]) return w[INIT_KEY] as Promise<void>;

  let raw: Promise<unknown>;
  try {
    raw = esbuild.initialize({ worker: true, wasmURL: WASM_URL });
  } catch (err) {
    // initialize может бросить синхронно, если её уже звали.
    raw = isAlreadyInitialized(err) ? Promise.resolve() : Promise.reject(err);
  }

  const guarded = raw.then(
    () => {
      // __ESBUILD_MAIN_READY__ tracks THIS realm's init specifically; the worker
      // and main thread are separate esbuild instances, so the shared
      // __ESBUILD_READY__ (warm flag for runCode) must not let the main path skip
      // its own initialize() when only the worker was inited.
      w.__ESBUILD_MAIN_READY__ = true;
      w.__ESBUILD_READY__ = true;
    },
    (err) => {
      if (isAlreadyInitialized(err)) {
        w.__ESBUILD_MAIN_READY__ = true;
        w.__ESBUILD_READY__ = true;
        return;
      }
      // Реальная ошибка инициализации (например, WASM вообще не загрузился).
      // esbuild.initialize в рамках страницы повторно звать нельзя, поэтому
      // оставляем этот (отклонённый) промис в кэше: следующие вызовы получат тот
      // же понятный текст ошибки, а не "more than once". Восстановление — только
      // перезагрузкой страницы.
      throw err;
    },
  );

  w[INIT_KEY] = guarded;
  return guarded;
}

function ensureMainThreadEsbuild(): Promise<void> {
  // Уже готов — мгновенно. Проверяем именно main-realm флаг: __ESBUILD_READY__
  // мог выставить воркер, но main-thread instance тогда ещё не инициализирован.
  if ((window as any).__ESBUILD_MAIN_READY__) return Promise.resolve();

  // Гонка с таймаутом нужна для UI: esbuild.initialize иногда никогда не
  // resolve/reject (WASM блокируется CSP или CDN недоступен) — без таймаута
  // сборка зависает молча. Сам initialize при этом НЕ перезапускаем.
  const init = getInitPromise();
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(
            `esbuild.initialize timed out (${INIT_TIMEOUT_MS / 1000}s) — couldn't load ${WASM_URL}`,
          ),
        ),
      INIT_TIMEOUT_MS,
    ),
  );

  return Promise.race([init, timeout]);
}

async function buildOnMainThread(input: BuildInput): Promise<{ code: string; stats?: PluginStats }> {
  // The main-thread esbuild instance may not be initialized — e.g. we reached
  // here via worker fallback, where only the worker was inited. Idempotent.
  await ensureMainThreadEsbuild();
  const stats = createPluginStats();
  const result = await esbuild.build({
    entryPoints: [input.entryPoint],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    plugins: [virtualFsPlugin(input.fs, stats)],
    external: input.external,
    jsx: "automatic",
    jsxDev: input.jsxDev,
    logLevel: "silent",
    define: input.define,
  });
  return { code: result.outputFiles?.[0]?.text || "", stats };
}

// ════════════════════════════════════════════════════════════════════════════
// Public API
// ════════════════════════════════════════════════════════════════════════════

// Warm up esbuild (worker or main thread). Idempotent; called early on the
// project route and again on idle from the preview viewer.
export function ensureEsbuild(): Promise<void> {
  if ((window as any).__ESBUILD_READY__) return Promise.resolve();
  if (workerBuildEnabled()) {
    const fallback = (err: unknown) => {
      // Worker couldn't boot/init (bundling, CSP, timeout) — pin to main thread.
      console.warn("[bundler] worker init failed, falling back to main thread", err);
      markWorkerDisabled();
      return ensureMainThreadEsbuild();
    };
    try {
      // ensureWorkerInit can also throw SYNCHRONOUSLY (e.g. `new Worker` rejected
      // by the environment), which a trailing .catch wouldn't see — guard both.
      return ensureWorkerInit().catch(fallback);
    } catch (err) {
      return fallback(err);
    }
  }
  return ensureMainThreadEsbuild();
}

export async function buildProjectFromFiles(files: any[], env: any = {}) {
  const input = makeBuildInput(files, env);

  if (workerBuildEnabled()) {
    try {
      const { code, stats } = await buildViaWorker(input);
      return { code, dependencies: input.externalDepsMap, stats };
    } catch (err) {
      // A genuine build error (user code) must surface as-is — the worker is
      // healthy, so don't disable it or rebuild on the main thread (that would
      // just reproduce the same error and permanently demote the session).
      if ((err as any)?.isPreviewBuildError) throw err;
      // Otherwise it's a worker-infra failure — fall back to the main thread for
      // this and every later build this session (avoids thrashing a broken worker).
      console.warn("[bundler] worker build failed, falling back to main thread", err);
      markWorkerDisabled();
    }
  }

  const { code, stats } = await buildOnMainThread(input);
  return { code, dependencies: input.externalDepsMap, stats };
}
