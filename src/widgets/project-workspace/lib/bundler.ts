import * as esbuild from "esbuild-wasm"
import { virtualFsPlugin } from "./esbuildPlugin"
import { previewOptimizationsEnabled } from "./preview-flags"

// ── Canvas per-route router shim ──────────────────────────────────────────
// In "perRoute" mode we redirect every `react-router`/`react-router-dom` import
// in the app to this generated module. It re-exports the real package unchanged
// but overrides the routers (BrowserRouter/HashRouter + createBrowserRouter/
// createHashRouter) with memory variants that boot at the frame's route
// (window.__PREVIEW_INITIAL_PATH__, set per frame by generatePreviewHtml).
// Redirecting the import *source* is robust to every import style — named,
// aliased, namespace (`import * as RR`), mixed default+named — unlike matching
// individual import names, which is fragile across generated apps.
const ROUTER_SHIM_IMPORT = "/src/__ugen_react_router_shim"
const ROUTER_SHIM_PATH = `${ROUTER_SHIM_IMPORT}.tsx`
const ROUTER_IMPORT_SOURCE_RE = /(\bfrom\s*["'])react-router(?:-dom)?(["'])/g
const ROUTER_SHIM_SOURCE = `
import React from "react";
import * as ReactRouterDOM from "react-router-dom";
export * from "react-router-dom";

function __ugenInitialEntries() {
  var p = typeof window !== "undefined" ? (window).__PREVIEW_INITIAL_PATH__ : null;
  return [p || "/"];
}

export function createBrowserRouter(routes, opts) {
  return ReactRouterDOM.createMemoryRouter(
    routes,
    Object.assign({}, opts, { initialEntries: __ugenInitialEntries() })
  );
}
export function createHashRouter(routes, opts) {
  return ReactRouterDOM.createMemoryRouter(
    routes,
    Object.assign({}, opts, { initialEntries: __ugenInitialEntries() })
  );
}
export function BrowserRouter(props) {
  return React.createElement(
    ReactRouterDOM.MemoryRouter,
    Object.assign({}, props, { initialEntries: __ugenInitialEntries() })
  );
}
export function HashRouter(props) {
  return React.createElement(
    ReactRouterDOM.MemoryRouter,
    Object.assign({}, props, { initialEntries: __ugenInitialEntries() })
  );
}
`

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
      w.__ESBUILD_READY__ = true;
    },
    (err) => {
      if (isAlreadyInitialized(err)) {
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

export function ensureEsbuild(): Promise<void> {
  // Уже готов — мгновенно.
  if ((window as any).__ESBUILD_READY__) return Promise.resolve();

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


// routerMode controls how react-router is rewritten for the srcDoc iframe:
//  - "simple" (default, single preview): blunt BrowserRouter -> MemoryRouter
//    string replace. Can't malform code, always boots at "/". Bulletproof.
//  - "perRoute" (canvas): surgical patch so each frame can boot on its own
//    route (component routers via initialEntries from window.__PREVIEW_INITIAL_PATH__;
//    object routers fall back to createMemoryRouter at "/"). The caller should
//    retry with "simple" if a perRoute build throws — see the canvas effect.
export async function buildProjectFromFiles(
  files: any[],
  env: any = {},
  opts: { routerMode?: "simple" | "perRoute" } = {},
) {
  const fs: Record<string, string> = {};
  let externalDepsMap: Record<string, string> = {};
  // perRoute only: did the surgical patch actually recognize a router? If not,
  // canvas frames can't be set to their route — the caller surfaces this.
  let routerPatched = false;

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

    if (opts.routerMode === "perRoute" && content?.includes("react-router")) {
      // Canvas: redirect react-router(-dom) imports to the shim so every frame
      // boots its own route, regardless of how the app imports the router.
      const redirected = content.replace(
        ROUTER_IMPORT_SOURCE_RE,
        `$1${ROUTER_SHIM_IMPORT}$2`,
      );
      if (redirected !== content) {
        routerPatched = true;
        content = redirected;
      }
    } else if (content?.includes("react-router-dom") && content?.includes("BrowserRouter")) {
      console.log(`[Bundler] Patching BrowserRouter to MemoryRouter in ${path}`);
      content = content.replace(/BrowserRouter/g, "MemoryRouter");
    }

    fs[path] = content;
  }

  // Add the router shim only when something actually imports react-router, so
  // it never collides with an app that doesn't use it.
  if (routerPatched) {
    fs[ROUTER_SHIM_PATH] = ROUTER_SHIM_SOURCE;
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

  for (const [shimPath, shimContent] of Object.entries(shimFiles)) {
    // Only add shim if file doesn't already exist in the virtual FS
    if (!fs[shimPath]) {
      fs[shimPath] = shimContent;
    }
  }

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

  const result = await esbuild.build({
    entryPoints: ["/__entry.tsx"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    plugins: [virtualFsPlugin(fs)],
    external: allExternals,
    jsx: "automatic",
    // Production JSX runtime (react/jsx-runtime), not jsx-dev-runtime. The dev
    // runtime pulls react.development from esm.sh as a SECOND React graph
    // alongside react-dom's production react.mjs — an extra large request plus a
    // dual-React hazard ("Invalid hook call"). The preview surfaces errors via
    // window.onerror, not React's dev warnings, so we lose nothing here.
    // Gated so the build-timer can A/B against the old dev runtime (see preview-flags).
    jsxDev: !previewOptimizationsEnabled(),
    logLevel: "silent",
    define: {
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
    },

  });

  return {
    code: result.outputFiles?.[0]?.text || "",
    dependencies: externalDepsMap,
    routerPatched,
  };
}
