import * as esbuild from "esbuild-wasm"
import { virtualFsPlugin } from "./esbuildPlugin"
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


export async function buildProjectFromFiles(files: any[], env: any = {}) {
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

    if (content?.includes("react-router-dom") && content?.includes("BrowserRouter")) {
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
  };
}
