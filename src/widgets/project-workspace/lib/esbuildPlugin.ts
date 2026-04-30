import * as esbuild from "esbuild-wasm"

/**
 * Find the matching closing `}` for the `{` at `braceStart`, counting nested braces.
 * Returns the index of the closing `}`, or -1 if not found.
 */
function findClosingBrace(css: string, braceStart: number): number {
  let depth = 0;
  for (let i = braceStart; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Minimal CSS cleaning for browser injection.
 * We use <style type="text/tailwindcss"> so the Tailwind CDN Play script
 * processes @apply, @layer, etc. natively — we only need to remove things
 * the CDN itself can't handle:
 *  - @tailwind directives  → CDN adds its own; duplicates cause warnings
 *  - local @import paths   → can't be resolved at runtime in the iframe
 */
function cleanCssForBrowser(raw: string): string {
  let css = raw;

  // Remove @tailwind directives (CDN already injects base/components/utilities)
  css = css.replace(/@tailwind\s+\S+;/g, "");

  // Remove @import for local/relative paths (leave CDN/https @imports untouched)
  css = css.replace(/@import\s+['"](?!https?:\/\/)([^'"]+)['"]\s*;/g, "");

  return css.trim();
}

function normalizePath(path: string) {
  const parts = path.split("/").filter(Boolean);
  const stack: string[] = [];

  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }

  return "/" + stack.join("/");
}

function getLoader(path: string): esbuild.Loader {
  if (path.endsWith(".tsx")) return "tsx";
  if (path.endsWith(".ts")) return "ts";
  if (path.endsWith(".jsx")) return "jsx";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  return "js";
}

export function virtualFsPlugin(fs: Record<string, string>): esbuild.Plugin {
  return {
    name: "virtual-fs",
    setup(build) {

      // ── 1. External CSS (npm packages like 'leaflet/dist/leaflet.css') ──
      build.onResolve({ filter: /\.css$/ }, (args) => {
        // Internal CSS (relative or absolute) → handled by virtual namespace
        if (args.path.startsWith(".") || args.path.startsWith("/")) return null;
        return { path: args.path, namespace: "cdn-css" };
      });

      // ── 2. @/ alias → /src/ ──
      build.onResolve({ filter: /^@\// }, (args) => {
        const resolvedPath = normalizePath("/src/" + args.path.slice(2));
        return { path: resolvedPath, namespace: "virtual" };
      });

      // ── 3. Catch-all resolver ──
      build.onResolve({ filter: /.*/ }, (args) => {
        // Entry point
        if (args.kind === "entry-point") {
          return { path: args.path, namespace: "virtual" };
        }

        // Relative imports
        if (args.path.startsWith(".")) {
          const importerDir = args.importer?.includes("/")
            ? args.importer.substring(0, args.importer.lastIndexOf("/"))
            : "/";
          const resolved = normalizePath(importerDir + "/" + args.path);
          return { path: resolved, namespace: "virtual" };
        }

        // Absolute imports
        if (args.path.startsWith("/")) {
          return { path: normalizePath(args.path), namespace: "virtual" };
        }

        // HTTP URLs → external (handled by importmap at runtime)
        if (args.path.startsWith("http")) {
          return { path: args.path, external: true };
        }

        // Everything else (npm packages) → external (importmap resolves them)
        return { path: args.path, external: true };
      });

      // ── 4. Load external CSS from CDN ──
      build.onLoad({ filter: /.*/, namespace: "cdn-css" }, (args) => {
        const cssUrl = `https://esm.sh/${args.path}`;
        const js = `
          (function() {
            const id = 'css-${args.path.replace(/[^a-z0-9]/g, '_')}';
            if (!document.getElementById(id)) {
              const link = document.createElement('link');
              link.id = id;
              link.rel = 'stylesheet';
              link.href = '${cssUrl}';
              document.head.appendChild(link);
            }
          })();
        `;
        return { contents: js, loader: "js" };
      });

      // ── 5. Load from virtual FS ──
      build.onLoad({ filter: /.*/, namespace: "virtual" }, (args) => {
        // Try multiple extensions in priority order (.tsx first for React projects)
        const extensions = [".tsx", ".ts", ".jsx", ".js", "", ".css", ".json"];
        const pathsToCheck = [args.path];

        if (!args.path.startsWith("/")) {
          pathsToCheck.push("/" + args.path);
        }

        // Also try /index variants for directory imports
        const indexPaths: string[] = [];
        for (const basePath of pathsToCheck) {
          for (const ext of extensions) {
            indexPaths.push(basePath + "/index" + ext);
          }
        }

        // First: check direct file matches
        for (const basePath of pathsToCheck) {
          for (const ext of extensions) {
            const fullPath = basePath + ext;
            if (fs[fullPath] != null) {
              if (fullPath.endsWith(".css")) {
                const cleanedCss = cleanCssForBrowser(fs[fullPath]);

                const js = `
                  (function() {
                    const id = 'virtual-css-${fullPath.replace(/[^a-z0-9]/g, '_')}';
                    if (!document.getElementById(id)) {
                      // Use type="text/tailwindcss" so the Tailwind CDN Play script
                      // processes @apply, @layer, and other Tailwind directives natively.
                      const style = document.createElement('style');
                      style.id = id;
                      style.setAttribute('type', 'text/tailwindcss');
                      style.textContent = ${JSON.stringify(cleanedCss)};
                      document.head.appendChild(style);
                      // Ask Tailwind CDN to re-scan after injecting new styles
                      if (typeof window.tailwind !== 'undefined' && typeof window.tailwind.refresh === 'function') {
                        window.tailwind.refresh();
                      }
                    }
                  })();
                `;
                return { contents: js, loader: "js" };
              }

              return {
                contents: fs[fullPath],
                loader: getLoader(fullPath),
              };
            }
          }
        }

        // Second: check /index variants (directory imports)
        for (const fullPath of indexPaths) {
          if (fs[fullPath] != null) {
            return {
              contents: fs[fullPath],
              loader: getLoader(fullPath),
            };
          }
        }

        console.warn(`[VirtualFS] File not found: ${args.path}. Available files:`, Object.keys(fs));

        return {
          errors: [{ text: `File not found in virtual FS: ${args.path}` }],
        };
      })
    },
  }
}
