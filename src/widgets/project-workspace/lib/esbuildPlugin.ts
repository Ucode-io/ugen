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
 * We use <style type="text/tailwindcss"> so the locally served Tailwind Play script
 * processes @apply, @layer, etc. natively — we only need to remove things
 * the CDN itself can't handle:
 *  - @tailwind directives  → CDN adds its own; duplicates cause warnings
 *  - local @import paths   → can't be resolved at runtime in the iframe
 */
function cleanCssForBrowser(raw: string): string {
  let css = raw;

  // Remove @tailwind directives (Tailwind Play already injects base/components/utilities)
  css = css.replace(/@tailwind\s+\S+;/g, "");

  // Remove @import for local/relative paths we can't resolve inside the iframe,
  // but KEEP `@import "tailwindcss"`: the Tailwind v4 browser build needs it to
  // pull in core (Preflight + utilities), otherwise `@apply font-normal` and every
  // other core utility fail as "unknown utility class". The v4 build only
  // auto-injects this import when the CSS has NO @import at all — and the project's
  // Google-fonts @import suppresses that — so we must preserve it explicitly.
  // CDN/https @imports are left untouched too. (v3 projects use @tailwind
  // directives, not this import, so this is a no-op there.)
  css = css.replace(
    /@import\s+['"](?!https?:\/\/|tailwindcss)([^'"]+)['"]\s*;/g,
    "",
  );

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

/**
 * Convert an SVG attribute name to its React/JSX prop name.
 * Keeps data-/aria-* as-is, maps `class` → `className`, and camelCases
 * the rest (`fill-rule` → `fillRule`, `xlink:href` → `xlinkHref`).
 */
function svgAttrToReactName(name: string): string {
  if (name.startsWith("data-") || name.startsWith("aria-")) return name;
  if (name === "class") return "className";
  return name.replace(/[-:](\w)/g, (_, c: string) => c.toUpperCase());
}

/** Parse the attributes of an opening `<svg ...>` tag into a JS object literal string. */
function svgAttrsToObjectLiteral(attrsStr: string): string {
  const re = /([:\w-]+)\s*=\s*"([^"]*)"/g;
  const entries: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(attrsStr)) !== null) {
    const rawName = m[1];
    // Skip string `style` — React expects a style object, a string throws.
    if (rawName === "style") continue;
    const name = svgAttrToReactName(rawName);
    entries.push(`${JSON.stringify(name)}: ${JSON.stringify(m[2])}`);
  }
  return "{" + entries.join(", ") + "}";
}

/**
 * Turn raw SVG markup into a JS module that mirrors `vite-plugin-svgr`:
 *  - named export `ReactComponent` → a React component spreading props onto <svg>
 *  - default export → a data-URI string (so `import url from './x.svg'` still works)
 *
 * The inner SVG markup is injected via dangerouslySetInnerHTML (parsed in the SVG
 * namespace by the browser), which avoids a fragile full JSX conversion of children.
 */
function svgToReactModule(raw: string): string {
  const svg = raw.trim();
  const open = svg.match(/<svg([^>]*)>/i);
  const attrsStr = open ? open[1] : "";
  const openEnd = open ? (open.index ?? 0) + open[0].length : 0;
  const closeIdx = svg.lastIndexOf("</svg>");
  const inner = closeIdx >= 0 ? svg.slice(openEnd, closeIdx) : "";
  const attrsLiteral = svgAttrsToObjectLiteral(attrsStr);
  const dataUri = "data:image/svg+xml," + encodeURIComponent(svg);

  return `
import * as React from "react";
const __attrs = ${attrsLiteral};
const __html = ${JSON.stringify(inner)};
export const ReactComponent = (props) => {
  const { className, ...rest } = props || {};
  const merged = [__attrs.className, className].filter(Boolean).join(" ");
  return React.createElement("svg", Object.assign(
    {},
    __attrs,
    rest,
    merged ? { className: merged } : {},
    { dangerouslySetInnerHTML: { __html: __html } }
  ));
};
const __src = ${JSON.stringify(dataUri)};
export default __src;
`;
}

export function virtualFsPlugin(fs: Record<string, string>): esbuild.Plugin {
  return {
    name: "virtual-fs",
    setup(build) {
      const extensions = [".tsx", ".ts", ".jsx", ".js", "", ".css", ".json", ".svg"];

      /**
       * Resolve a logical path to a concrete virtual-FS key, trying extensions
       * and `/index` variants (directory imports). Returns null if nothing matches.
       */
      const findFsKey = (logicalPath: string): string | null => {
        const bases = logicalPath.startsWith("/")
          ? [logicalPath]
          : [logicalPath, "/" + logicalPath];

        for (const base of bases) {
          for (const ext of extensions) {
            if (fs[base + ext] != null) return base + ext;
          }
        }
        for (const base of bases) {
          for (const ext of extensions) {
            if (fs[base + "/index" + ext] != null) return base + "/index" + ext;
          }
        }
        return null;
      };

      /**
       * Build a `virtual` resolve result for a logical import path. Strips any
       * query suffix (e.g. `?react`, `?url`) before probing the FS, and resolves
       * to the *real* file key so esbuild uses it as the module identity — this
       * keeps relative imports inside `index` files anchored to the right dir.
       */
      const resolveVirtual = (rawPath: string) => {
        const qi = rawPath.indexOf("?");
        const query = qi >= 0 ? rawPath.slice(qi + 1) : "";
        const bare = qi >= 0 ? rawPath.slice(0, qi) : rawPath;
        const normalized = normalizePath(bare);
        // Fall back to the normalized path so onLoad can emit a clear error.
        const fsKey = findFsKey(normalized) ?? normalized;
        const path = query ? fsKey + "?" + query : fsKey;
        return {
          path,
          namespace: "virtual" as const,
          pluginData: { fsKey, query },
        };
      };

      // ── 1. External CSS (npm packages like 'leaflet/dist/leaflet.css') ──
      build.onResolve({ filter: /\.css$/ }, (args) => {
        // Internal CSS (relative or absolute) → handled by virtual namespace
        if (args.path.startsWith(".") || args.path.startsWith("/")) return null;
        return { path: args.path, namespace: "cdn-css" };
      });

      // ── 2. @/ alias → /src/ ──
      build.onResolve({ filter: /^@\// }, (args) => {
        return resolveVirtual("/src/" + args.path.slice(2));
      });

      // ── 3. Catch-all resolver ──
      build.onResolve({ filter: /.*/ }, (args) => {
        // Entry point
        if (args.kind === "entry-point") {
          return resolveVirtual(args.path);
        }

        // Relative imports
        if (args.path.startsWith(".")) {
          // Importer path may carry a query suffix (e.g. an .svg?react module);
          // strip it before deriving the importer directory.
          const importerBare = args.importer.split("?")[0];
          const importerDir = importerBare.includes("/")
            ? importerBare.substring(0, importerBare.lastIndexOf("/"))
            : "/";
          return resolveVirtual(importerDir + "/" + args.path);
        }

        // Absolute imports
        if (args.path.startsWith("/")) {
          return resolveVirtual(args.path);
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
        // The resolver records the concrete FS key in pluginData. Fall back to
        // probing the (query-stripped) path for entry points / safety.
        const pluginData = args.pluginData as { fsKey?: string } | undefined;
        const fullPath =
          pluginData?.fsKey ?? findFsKey(normalizePath(args.path.split("?")[0]));

        if (!fullPath || fs[fullPath] == null) {
          console.warn(
            `[VirtualFS] File not found: ${args.path}. Available files:`,
            Object.keys(fs),
          );
          return {
            errors: [{ text: `File not found in virtual FS: ${args.path}` }],
          };
        }

        // SVG → React component module (mirrors vite-plugin-svgr `?react`).
        if (fullPath.endsWith(".svg")) {
          return { contents: svgToReactModule(fs[fullPath]), loader: "js" };
        }

        if (fullPath.endsWith(".css")) {
          const cleanedCss = cleanCssForBrowser(fs[fullPath]);

          const js = `
            (function() {
              const id = 'virtual-css-${fullPath.replace(/[^a-z0-9]/g, '_')}';
              if (!document.getElementById(id)) {
                // Use type="text/tailwindcss" so the local Tailwind Play script
                // processes @apply, @layer, and other Tailwind directives natively.
                const style = document.createElement('style');
                style.id = id;
                style.setAttribute('type', 'text/tailwindcss');
                style.textContent = ${JSON.stringify(cleanedCss)};
                document.head.appendChild(style);
                // Ask Tailwind Play to re-scan after injecting new styles
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
      })
    },
  }
}
