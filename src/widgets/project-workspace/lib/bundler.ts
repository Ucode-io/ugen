import * as esbuild from "esbuild-wasm"
import { virtualFsPlugin } from "./esbuildPlugin"

let initPromise: Promise<void> | null = null;

export function ensureEsbuild() {
  if (!initPromise) {
    initPromise = esbuild.initialize({
      worker: true,
      wasmURL: "https://unpkg.com/esbuild-wasm@0.27.3/esbuild.wasm",
    });
  }
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

  const defaultExternals = [
    "react",
    "react-dom",
    "react-dom/client",
    "react-router-dom",
    "react-dom/server",
    "axios",
    "lucide-react"
  ];

  const allExternals = [...new Set([...Object.keys(externalDepsMap), ...defaultExternals])];

  for (const file of files) {
    let path = file.path.startsWith("/") ? file.path.slice(1) : file.path;
    if (!path.startsWith("src/") && path !== "package.json")
      path = "src/" + path; // fix logic slightly
    path = "/" + path;

    let content = file.content;

    if (content.includes("react-router-dom") && content.includes("BrowserRouter")) {
      console.log(`[Bundler] Patching BrowserRouter to MemoryRouter in ${path}`);
      content = content.replace(/BrowserRouter/g, "MemoryRouter");
    }

    fs[path] = content;
  }

  fs["/__entry.jsx"] = `
    import App from "./src/App.jsx";
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
      console.error(e)
    }
  `;

  const result = await esbuild.build({
    entryPoints: ["__entry.jsx"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    plugins: [virtualFsPlugin(fs)],
    external: allExternals,
    define: {
      "process.env.NODE_ENV": '"development"',
      "import.meta.env": JSON.stringify(env),
    },
  });

  return {
    code: result.outputFiles?.[0]?.text || "",
    dependencies: externalDepsMap,
  };
}
