import * as esbuild from "esbuild-wasm"
import { virtualFsPlugin } from "./esbuildPlugin"

let initPromise: Promise<void> | null = null;

const WASM_URL = "https://esm.sh/esbuild-wasm@0.27.3/esbuild.wasm";

export function ensureEsbuild() {
  // 1. Проверяем локальный промис (текущая сессия)
  if (initPromise) return initPromise;

  // 2. Проверяем глобальный флаг (на случай, если компонент пересоздался)
  if ((window as any).__ESBUILD_READY__) {
    initPromise = Promise.resolve();
    return initPromise;
  }

  // 3. Если ничего нет, инициализируем
  initPromise = esbuild.initialize({
    worker: true,
    wasmURL: WASM_URL,
  })
    .then(() => {
      (window as any).__ESBUILD_READY__ = true;
    })
    .catch((err) => {
      if (err.message?.includes("initialize") || err.message?.includes("already")) {
        (window as any).__ESBUILD_READY__ = true;
        return;
      }
      initPromise = null;
      throw err;
    });

  return initPromise;
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
    jsxDev: true,
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
