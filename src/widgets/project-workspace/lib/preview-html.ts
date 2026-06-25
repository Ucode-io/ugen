import { previewOptimizationsEnabled } from "./preview-flags";

// Include this in preview build cache keys. Bump it whenever the generated
// iframe runtime changes so long-lived tabs cannot reuse stale srcDoc HTML.
export const PREVIEW_RUNTIME_VERSION = "6";

const TAILWIND_PLAY_RUNTIME_URL = "/tailwind-play-3.4.17.js";
// Tailwind v4 projects are CSS-first: their theme lives in the stylesheet via
// @theme/@utility/@custom-variant (no tailwind.config.js), which the v3 Play
// runtime can't parse — `@apply font-outfit` etc. throw "class does not exist".
// For those we load Tailwind's official browser build, which compiles
// @theme/@utility/@apply natively from the project's own CSS. Committed under
// /public like the v3 runtime above; the version in the filename busts the cache.
const TAILWIND_BROWSER_V4_URL = "/tailwindcss-browser-4.3.1.js";

export const PREVIEW_Refresher_SCRIPT = `
  window.addEventListener("error", (e) => {
    console.error("Preview Error:", e);
  });
`;

export const INSPECTOR_SCRIPT = `
  let overlay = null;
  let overlayTag = null;
  let selOverlay = null;
  let selTag = null;
  let enabled = false;
  let lastSelected = null;
  const originalStyles = new WeakMap();

  // ── Hover overlay (dashed, light) ──
  function ensureOverlay() {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.style.cssText = "position:fixed;pointer-events:none;z-index:999998;border:1px dashed rgba(98,192,255,0.7);border-radius:2px;transition:none;";
      overlayTag = document.createElement("div");
      overlayTag.style.cssText = "position:absolute;pointer-events:none;bottom:calc(100% + 4px);left:0;padding:1px 5px;border-radius:3px;background:#62c0ff;color:#fff;font-size:11px;font-family:monospace;white-space:nowrap;";
      overlay.appendChild(overlayTag);
      document.body.appendChild(overlay);
    }
  }

  // ── Selected overlay (solid, prominent) ──
  function ensureSelOverlay() {
    if (!selOverlay) {
      selOverlay = document.createElement("div");
      selOverlay.style.cssText = "position:fixed;pointer-events:none;z-index:999999;border:2px solid #493CDD;border-radius:3px;box-shadow:0 0 0 3px rgba(73,60,221,0.15);transition:top 0.12s ease,left 0.12s ease,width 0.12s ease,height 0.12s ease;";
      selTag = document.createElement("div");
      selTag.style.cssText = "position:absolute;pointer-events:none;top:calc(-100% - 6px);left:-2px;padding:2px 6px;border-radius:4px;background:#493CDD;color:#fff;font-size:11px;font-family:monospace;white-space:nowrap;line-height:1.6;";
      selOverlay.appendChild(selTag);
      document.body.appendChild(selOverlay);
    }
  }

  function getLabel(el) {
    let label = el.tagName.toLowerCase();
    if (el.id) label += "#" + el.id;
    else if (el.classList.length) label += "." + [...el.classList].slice(0, 2).join(".");
    return label;
  }

  function highlight(el) {
    ensureOverlay();
    if (el === document.documentElement || el === document.body) { overlay.style.display = "none"; return; }
    const rect = el.getBoundingClientRect();
    overlay.style.display = "block";
    overlay.style.top = rect.top + "px";
    overlay.style.left = rect.left + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";
    overlayTag.textContent = getLabel(el);
  }

  function positionSelOverlay(el) {
    if (!el || !selOverlay) return;
    const rect = el.getBoundingClientRect();
    selOverlay.style.top = rect.top + "px";
    selOverlay.style.left = rect.left + "px";
    selOverlay.style.width = rect.width + "px";
    selOverlay.style.height = rect.height + "px";
    selOverlay.style.display = "block";
  }

  function showSelOverlay(el) {
    ensureSelOverlay();
    selTag.textContent = getLabel(el);
    positionSelOverlay(el);
  }

  function clearSelOverlay() {
    if (selOverlay) selOverlay.style.display = "none";
  }

  function clear() {
    overlay?.remove(); overlay = null;
    clearSelOverlay();
  }

  // Reposition selected overlay on scroll / resize (element may move)
  document.addEventListener("scroll", function() {
    if (lastSelected) positionSelOverlay(lastSelected);
  }, true);
  window.addEventListener("resize", function() {
    if (lastSelected) positionSelOverlay(lastSelected);
  });

  function getDomPath(el) {
    const path = [];
    let current = el;

    while (current && current.nodeType === 1) {
      let selector = current.tagName.toLowerCase();

      if (current.id) {
        selector += "#" + current.id;
        path.unshift(selector);
        break; // id — якорь, дальше не идём
      } else {
        const parent = current.parentElement;
        if (parent) {
          const index = Array.from(parent.children).indexOf(current) + 1;
          selector += ":nth-child(" + index + ")";
        }
      }

      path.unshift(selector);
      current = current.parentElement;
    }

    return path.join(" > ");
  }

  document.addEventListener("mouseover", (e) => {
    if (!enabled) return;
    highlight(e.target);
  }, true);

  // Walk React fiber tree to find the nearest user-defined component name (uppercase)
  function getComponentName(el) {
    try {
      var fiberKey = Object.keys(el).find(function(k) {
        return k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance');
      });
      if (!fiberKey) return null;
      var fiber = el[fiberKey];
      while (fiber) {
        var type = fiber.type;
        if (typeof type === 'function') {
          var name = type.displayName || type.name;
          if (name && name.length > 1 && name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase()) {
            return name;
          }
        }
        fiber = fiber.return;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  document.addEventListener("click", (e) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    const rect = target.getBoundingClientRect();

    // SVG elements have className as SVGAnimatedString (not clonable) — use baseVal
    var rawClass = target.className;
    var className = typeof rawClass === 'string' ? rawClass : (rawClass && rawClass.baseVal) || '';

    // Get outerHTML as a single opening tag (no children, truncated)
    var outerHTML = null;
    try {
      var raw = target.outerHTML || '';
      // Keep only the opening tag — slice before the first '>'
      var firstTag = raw.slice(0, raw.indexOf('>') + 1);
      outerHTML = firstTag.slice(0, 300) || null;
    } catch (_) {}

    lastSelected = target;
    showSelOverlay(target);

    window.parent.postMessage({
      type: "INSPECT_SELECT",

      tag: target.tagName,
      id: target.id || null,
      className: className || null,

      name: target.getAttribute("data-element-name") || null,

      domPath: getDomPath(target),

      textContent: (target.textContent || "").trim().slice(0, 200) || null,

      componentName: getComponentName(target),
      outerHTML: outerHTML,

      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    }, "*");
  }, true);

  function resolveTarget(domPath) {
    if (domPath) {
      try {
        var found = document.querySelector(domPath);
        if (found) return found;
      } catch (_) {}
    }
    return lastSelected;
  }

  function snapshotIfNeeded(el) {
    if (!originalStyles.has(el)) {
      originalStyles.set(el, el.getAttribute('style') || '');
    }
  }

  window.addEventListener("message", (e) => {
    if (e.data?.type === "INSPECT_ON") {
      enabled = true;
      document.body.style.cursor = "default";
    }

    if (e.data?.type === "INSPECT_OFF") {
      enabled = false;
      document.body.style.cursor = "default";
      lastSelected = null;
      clear();
    }

    if (e.data?.type === "INSPECT_DESELECT") {
      lastSelected = null;
      clearSelOverlay();
    }

    if (e.data?.type === "STYLE_APPLY") {
      var el = resolveTarget(e.data.domPath);
      if (!el) return;
      snapshotIfNeeded(el);
      var styles = e.data.styles || {};
      Object.keys(styles).forEach(function (prop) {
        var val = styles[prop];
        var kebab = prop.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); });
        if (val == null || val === '') {
          el.style.removeProperty(kebab);
        } else {
          el.style.setProperty(kebab, String(val));
        }
      });
    }

    if (e.data?.type === "STYLE_RESET") {
      var el2 = resolveTarget(e.data.domPath);
      if (!el2 || !originalStyles.has(el2)) return;
      var orig = originalStyles.get(el2);
      if (orig) el2.setAttribute('style', orig);
      else el2.removeAttribute('style');
      originalStyles.delete(el2);
    }

    if (e.data?.type === "GET_COMPUTED_STYLES") {
      var el3 = resolveTarget(e.data.domPath);
      if (!el3) return;
      var cs = window.getComputedStyle(el3);
      window.parent.postMessage({
        type: "COMPUTED_STYLES_RESULT",
        domPath: e.data.domPath,
        styles: {
          color: cs.color,
          backgroundColor: cs.backgroundColor,
          borderColor: cs.borderColor,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          fontFamily: cs.fontFamily,
          lineHeight: cs.lineHeight,
          letterSpacing: cs.letterSpacing,
        }
      }, "*");
    }
  });
`;

// Pick the React version for the importmap from the project's own package.json.
// Templates that target React 19 (e.g. Mantine 9 / BlockNote, which import the
// React-19-only `use` API) must NOT be forced onto React 18 — that throws
// "does not provide an export named 'use'" at runtime. React-18 templates keep
// the known-good 18.3.1 pin, so existing previews are unaffected.
const REACT_18_VERSION = "18.3.1";
// Latest stable 19.x. Must be ≥ 19.2.0: Mantine 9 (pulled transitively by
// BlockNote) imports `useEffectEvent`, which only exists from React 19.2.0 — an
// older 19.0.0 pin throws "does not provide an export named 'useEffectEvent'".
// 19.2.x also has `use` (the earlier Mantine-9 crash). Keep react/react-dom in
// lockstep on this version.
const REACT_19_VERSION = "19.2.7";

function resolveReactVersion(deps: Record<string, string>): string {
  const spec = deps.react || deps["react-dom"];
  if (!spec) return REACT_18_VERSION;
  // Strip range operators (^, ~, >=, etc.) and read the major.
  const cleaned = spec.replace(/^[^\d]*/, "").trim();
  const major = parseInt(cleaned, 10);
  if (major >= 19) return REACT_19_VERSION;
  return REACT_18_VERSION;
}

// Some templates declare React 19 but pin React-18-era package versions that
// import APIs React 19 removed (findDOMNode/render/hydrate/unmountComponentAtNode).
// Because esm.sh bakes a pinned absolute react-dom URL into those packages under
// `?deps=`, an importmap shim can't intercept them — the only reliable fix is to
// build their esm.sh URL from a React-19-compatible version instead.
//
// Each entry is EMPIRICALLY verified (the esm.sh build for that version no longer
// imports the removed API and preserves the public API the app uses) — not picked
// from a changelog. Add a pair only after confirming the override loads clean.
//
//  - react-datepicker 6.x → react-onclickoutside@6 → `findDOMNode` (removed in 19).
//    7.6.0 dropped react-onclickoutside, supports React ^19, keeps date-fns v3
//    (same major as 6.x → minimal drift), and still exports default DatePicker +
//    named registerLocale/setDefaultLocale.
const REACT_19_VERSION_OVERRIDES: Record<string, string> = {
  "react-datepicker": "7.6.0",
};

// Packages whose esm.sh URL must NOT carry the `?deps=react,react-dom` param.
// esm.sh serves two build variants of a package: a `?deps`-hashed one and a
// PLAIN one. Sibling packages cross-import the PLAIN build. If the app imports
// such a package WITH `?deps`, it loads the hashed variant — a SECOND instance
// alongside the plain one siblings use. For a framework-agnostic singleton this
// duplicates module-load side effects. Concretely: @blocknote/react and
// @blocknote/mantine import the plain `/@blocknote/core@x/es2022/core.mjs`, but
// the app importing `@blocknote/core` with `?deps` got the hashed build — two
// @blocknote/core instances, each registering ProseMirror's "multiple-node"
// selection into the shared prosemirror-state registry → RangeError "Duplicate
// use of selection JSON ID". @blocknote/core imports no React, so the plain
// build is safe. Matched by exact name or `name/`-subpath.
const PLAIN_BUILD_PACKAGES = new Set<string>(["@blocknote/core"]);

function isPlainBuildPackage(pkgName: string): boolean {
  return PLAIN_BUILD_PACKAGES.has(pkgName);
}

// On React-19 projects, swap known-incompatible dependency versions for their
// verified React-19 versions BEFORE any esm.sh URL is built. No-op on React 18,
// so existing previews are untouched. Returns a new map; never mutates the input.
function applyReact19Overrides(
  deps: Record<string, string>,
  reactVersion: string,
): Record<string, string> {
  if (parseInt(reactVersion, 10) < 19) return deps;
  const out = { ...deps };
  for (const [name, version] of Object.entries(REACT_19_VERSION_OVERRIDES)) {
    if (out[name]) out[name] = version;
  }
  return out;
}


// Tailwind v4 is CSS-first: the theme is declared in the stylesheet via
// `@import "tailwindcss"`, `@theme`, `@utility`, or `@custom-variant`, with no
// tailwind.config.js. Detect it from the project's CSS so the preview loads the
// matching Tailwind runtime (v4 browser build vs v3 Play).
function isTailwindV4(
  files: Array<{ path: string; content: string }>,
): boolean {
  return files.some(
    (f) =>
      f.path.endsWith(".css") &&
      /@import\s+["']tailwindcss["']|@theme\b|@custom-variant\b|@utility\b/.test(
        f.content || "",
      ),
  );
}

export function generatePreviewHtml(
  bundledCode: string,
  dependenciesMap: Record<string, string> = {},
  files: Array<{ path: string; content: string }> = [],
) {
  const REACT_VERSION = resolveReactVersion(dependenciesMap);
  // Apply React-19 version overrides before building any esm.sh URL so both the
  // dependency loop and the bundle-scan fallback below use the corrected version.
  dependenciesMap = applyReact19Overrides(dependenciesMap, REACT_VERSION);
  // A srcDoc iframe's location is `about:srcdoc`, whose origin is the string
  // "null" and cannot be used as the base passed to `new URL(relative, base)`.
  // Give generated apps a stable, valid base while keeping preview resources on
  // the same origin as the workspace.
  const previewBaseUrl =
    typeof window !== "undefined" &&
    window.location.origin &&
    window.location.origin !== "null"
      ? `${window.location.origin}/`
      : "https://preview.local/";

  const tailwindConfigFile = files.find((f) => f.path === "tailwind.config.js");

  let tailwindConfigJson = "{}";
  if (tailwindConfigFile) {
    try {
      // Убираем export default и require() — выполняем как выражение
      const configStr = tailwindConfigFile.content
        .replace(/\/\*[\s\S]*?\*\//g, "") // убираем JSDoc комментарии
        .replace(/export\s+default\s+/, "") // убираем export default
        .replace(/require\([^)]+\)/g, "{}") // убираем require()
        .trim()
        .replace(/;$/, ""); // убираем точку с запятой в конце

      // Выполняем как выражение и получаем объект
      const configObj = new Function(`return ${configStr}`)();

      // Убираем plugins — они не работают в браузере
      delete configObj.plugins;
      delete configObj.content; // CDN сам сканирует DOM

      tailwindConfigJson = JSON.stringify(configObj);
    } catch (e) {
      console.warn("Failed to parse tailwind.config.js:", e);
    }
  }

  // Pick the Tailwind runtime by project: v4 (CSS-first @theme/@utility) loads the
  // official browser build, which reads the theme from the project's own CSS; v3
  // loads Tailwind Play and gets the theme from the parsed tailwind.config.js.
  const tailwindV4 = isTailwindV4(files);
  const tailwindRuntimeUrl = tailwindV4
    ? TAILWIND_BROWSER_V4_URL
    : TAILWIND_PLAY_RUNTIME_URL;
  const tailwindRuntimeHead = tailwindV4
    ? `<!-- Tailwind v4 browser build: compiles @theme/@utility/@apply from the
           project's own CSS. Auto-runs on load, scans <style type="text/tailwindcss">
           blocks (what the esbuild plugin injects), recompiles on React mount. -->
      <script
        src="${TAILWIND_BROWSER_V4_URL}"
        onerror="window.__TAILWIND_PREVIEW_FAILED__ = true"
      ></script>`
    : `<!-- Tailwind Play is pinned and served locally. A remote CDN failure used
           to reveal completely unstyled preview HTML after the cloak timeout. -->
      <script
        src="${TAILWIND_PLAY_RUNTIME_URL}"
        onerror="window.__TAILWIND_PREVIEW_FAILED__ = true"
      ></script>
      <script>
        window.tailwind = window.tailwind || {};
        window.tailwind.config = ${tailwindConfigJson};
      </script>`;

  // IMPORTANT: keep `?deps=react@…,react-dom@…` on every esm.sh URL. It pins all
  // packages to a single /react@${REACT_VERSION}/…/react.mjs instance — dropping
  // it (or switching to ?bundle/?standalone) reintroduces a second React graph
  // and "Invalid hook call". Exact versions also avoid 302 redirects from esm.sh.
  const depsParam = `?deps=react@${REACT_VERSION},react-dom@${REACT_VERSION}`;

  // Static imports: only React core (version must be pinned and consistent)
  const imports: Record<string, string> = {
    react: `https://esm.sh/react@${REACT_VERSION}`,
    "react/jsx-runtime": `https://esm.sh/react@${REACT_VERSION}/jsx-runtime`,
    "react/jsx-dev-runtime": `https://esm.sh/react@${REACT_VERSION}/jsx-dev-runtime`,
    "react-dom": `https://esm.sh/react-dom@${REACT_VERSION}`,
    "react-dom/client": `https://esm.sh/react-dom@${REACT_VERSION}/client`,
    "react-dom/server": `https://esm.sh/react-dom@${REACT_VERSION}/server`,
  };

  // Dynamic imports: everything from package.json dependencies
  // This covers react-router-dom, lucide-react, all Radix packages, etc.
  Object.entries(dependenciesMap).forEach(([name, versionSpec]) => {
    // Skip already-defined and React itself (pinned above)
    if (imports[name]) return;
    if (name === "react" || name === "react-dom") return;

    // Skip dev-only dependencies that shouldn't run in the browser bundle
    if (
      name === "tailwindcss-animate" ||
      name === "tailwindcss" ||
      name === "autoprefixer" ||
      name === "postcss"
    )
      return;

    const version = versionSpec.replace(/[\^~]/, "") || "latest";

    // For Radix UI packages, we need sub-path exports to work
    // esm.sh handles this automatically when version is specified
    const params = isPlainBuildPackage(name) ? "" : depsParam;
    imports[name] = `https://esm.sh/${name}@${version}${params}`;
  });

  // ── react-router must dedupe to react-router-dom's exact build ──
  // react-router-dom@6 and bare `react-router` share ONE Router context. They
  // must resolve to the SAME esm.sh build or the context splits and consumers
  // throw "useX() may be used only in the context of a <Router>" (the H invariant
  // in @remix-run/router). Two traps:
  //   1. `react-router` is usually NOT in package.json, so the bundle-scan
  //      fallback below would pin it to esm.sh "latest" (a different major).
  //   2. esm.sh keys builds by their `?deps` hash. react-router-dom@6 imports
  //      react-router with a REACT-ONLY hash, but our uniform `?deps=react,
  //      react-dom` would resolve bare `react-router` to a different build.
  // Both are fixed by pinning react-router to react-router-dom's version with
  // react-only deps (react-router@6's only React peer), matching the internal
  // build so the browser dedupes to a single module/context.
  const rrdSpec = dependenciesMap["react-router-dom"];
  const rrdMajor = rrdSpec ? parseInt(rrdSpec.replace(/^[^\d]*/, ""), 10) : 0;
  if (rrdSpec && rrdMajor === 6) {
    const rrVersion =
      (dependenciesMap["react-router"] || rrdSpec).replace(/[\^~]/, "") ||
      "latest";
    imports["react-router"] = `https://esm.sh/react-router@${rrVersion}?deps=react@${REACT_VERSION}`;
  }

  // ── Auto-detect sub-path imports from the bundled output ──
  // esbuild marks externals as bare imports in ESM output.
  // The importmap has "zustand" but not "zustand/middleware".
  // We scan the bundle for ALL bare specifiers and fill in any gaps.
  const importPattern = /(?:from|import)\s+["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = importPattern.exec(bundledCode)) !== null) {
    const specifier = match[1];
    if (!specifier || imports[specifier]) continue;
    // Skip relative, absolute, and URL imports
    if (
      specifier.startsWith(".") ||
      specifier.startsWith("/") ||
      specifier.startsWith("http")
    )
      continue;

    // Extract the package name (handles @scope/package/subpath)
    const pkgName = specifier.startsWith("@")
      ? specifier.split("/").slice(0, 2).join("/")
      : specifier.split("/")[0];

    const versionSpec = dependenciesMap[pkgName];
    if (versionSpec) {
      const cleanVersion = versionSpec.replace(/[\^~]/, "") || "latest";
      // Build the sub-path URL: e.g. zustand@5.0.0/middleware?deps=...
      const subPath = specifier.slice(pkgName.length); // e.g. "/middleware"
      // Keep plain-build packages (and their subpaths) off `?deps` so they
      // dedupe with the build sibling packages cross-import — see above.
      const params = isPlainBuildPackage(pkgName) ? "" : depsParam;
      imports[specifier] =
        `https://esm.sh/${pkgName}@${cleanVersion}${subPath}${params}`;
    } else {
      // Unknown package (not in package.json) — try latest from esm.sh
      imports[specifier] = `https://esm.sh/${specifier}${depsParam}`;
    }
  }

  // ── Warm up the runtime network early ──
  // The bundle externalizes react/radix/lucide/etc and resolves them from esm.sh
  // at iframe runtime. Left alone the browser discovers those URLs only while
  // parsing the module graph → a serial waterfall. preconnect opens the esm.sh
  // (and Tailwind CDN) connections up front, and modulepreload kicks off the
  // fetch of every top-level importmap URL in parallel before the module script
  // runs. `crossorigin` is required so the preload matches the CORS-mode fetch
  // the module graph issues (otherwise it would double-fetch). Zero correctness
  // risk — these are the exact URLs the bundle imports.
  // jsx-dev-runtime is excluded: optimized builds use jsxDev:false so it's never
  // imported (preloading it would warn "preloaded but not used").
  // Gated by the kill-switch so the build-timer can A/B with this off.
  const warmupHead = previewOptimizationsEnabled()
    ? [
        `<link rel="preconnect" href="https://esm.sh" crossorigin>`,
        ...Object.entries(imports)
          .filter(([spec]) => spec !== "react/jsx-dev-runtime")
          .map(
            ([, url]) => `<link rel="modulepreload" href="${url}" crossorigin>`,
          ),
      ].join("\n      ")
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
      <base href="${previewBaseUrl}">
      ${warmupHead}
      ${tailwindRuntimeHead}
      
      <script>
        window.process = { env: { NODE_ENV: 'production' } };
      </script>

      <script>
        // Generated apps commonly construct URLs that browsers reject inside a
        // srcDoc iframe:
        //   new URL('/path', window.location.origin) // origin is "null"
        //   new URL('/path')                         // relative input, no base
        //   new URL('example.com/path')              // missing protocol
        // Repair those preview-safe cases and enrich any remaining error with
        // the actual input/base values instead of React DOM's rethrow location.
        (function() {
          var NativeURL = window.URL;

          function describe(value) {
            if (value === undefined) return "undefined";
            if (value === null) return "null";
            try { return JSON.stringify(String(value)); } catch (_) { return "<unprintable>"; }
          }

          function isUnusableBase(value) {
            var base = value == null ? "" : String(value).trim();
            return (
              !base ||
              base === "null" ||
              base === "undefined" ||
              base.startsWith("about:srcdoc") ||
              base.startsWith("about:blank")
            );
          }

          function isRelativeInput(value) {
            return (
              !/^[a-z][a-z0-9+.-]*:/i.test(value) &&
              !/\\s/.test(value)
            );
          }

          function isSchemeLessHost(value) {
            var match = value.match(
              /^([a-z0-9.-]+\\.([a-z]{2,}))(?::\\d+)?(?:[/?#].*)?$/i
            );
            if (!match) return false;
            // A bare asset filename such as logo.svg is a relative path, not a
            // host. Keep common web-file extensions on the relative path branch.
            return !/^(?:avif|css|gif|htm|html|ico|jpe?g|js|json|map|mjs|png|svg|ts|tsx|txt|webp|woff2?|xml)$/i.test(
              match[2]
            );
          }

          window.URL = new Proxy(NativeURL, {
            construct: function(Target, args, NewTarget) {
              var originalInput = args[0];
              var originalBase = args.length > 1 ? args[1] : undefined;
              var input = typeof originalInput === "string"
                ? originalInput.trim()
                : "";

              if (args.length > 1 && isUnusableBase(originalBase)) {
                args[1] = document.baseURI;
              }

              try {
                return Reflect.construct(Target, args, NewTarget);
              } catch (error) {
                if (args.length === 1 && input && isSchemeLessHost(input)) {
                  return Reflect.construct(Target, ["https://" + input], NewTarget);
                }
                if (args.length === 1 && input && isRelativeInput(input)) {
                  return Reflect.construct(Target, [input, document.baseURI], NewTarget);
                }

                var detail =
                  "input=" + describe(originalInput) +
                  ", base=" + describe(originalBase);
                var enriched = new TypeError(
                  "Failed to construct 'URL': Invalid URL (" + detail + ")"
                );
                enriched.cause = error;
                throw enriched;
              }
            }
          });
        })();
      </script>

      <script type="importmap">
        ${JSON.stringify({ imports }, null, 2)}
      </script>

      <style>
        html, body { height: 100%; margin: 0; padding: 0; }
        /* #root uses min-height (not a fixed 100%) so apps laid out in natural
           document flow — content taller than the viewport with no inner
           overflow:auto scroller — can grow past the frame height and the page
           scrolls to reach them. A fixed height:100% here pins #root to exactly
           the viewport and clips anything below the fold (no scroll). */
        #root { min-height: 100%; margin: 0; padding: 0; }

        /* Hide the page scrollbar (content stays scrollable) — keeps the
           device-frame preview clean. Inner component scrollbars are untouched. */
        html, body { scrollbar-width: none; -ms-overflow-style: none; }
        html::-webkit-scrollbar, body::-webkit-scrollbar { width: 0; height: 0; display: none; }

        /* The preview already renders the device frame, so flatten any phone /
           device-mockup wrapper the generated app added of its own accord —
           otherwise the app sits inside a second frame with extra padding and
           looks unnatural. We only neutralise the framing (size/padding/border),
           never the background, so the app's own colors still bleed edge-to-edge. */
        .phone-frame-backdrop, .phone-frame, .phone-mockup, .phone-wrapper,
        .device-frame, .device-mockup, .device-wrapper, .mobile-frame, .iphone-frame {
          padding: 0 !important;
          margin: 0 !important;
          width: 100% !important;
          max-width: none !important;
          min-height: 100% !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        html.dark .leaflet-layer,
        html.dark .leaflet-control { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }

        html.dark body { background-color: #191919; color: #D4D4D4; }
      </style>

      <style id="preview-cloak">body { visibility: hidden; }</style>

      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    </head>
    <body>
      <div id="root"></div>

      <script>
        (function() {
          var reportedErrors = new Set();

          function reportError(payload) {
            var signature = [
              payload.message || "",
              payload.filename || "",
              payload.lineno || "",
              payload.colno || ""
            ].join("|");
            if (reportedErrors.has(signature)) return;
            if (reportedErrors.size >= 50) reportedErrors.clear();
            reportedErrors.add(signature);

            try {
              window.parent.postMessage({ type: 'PREVIEW_RUNTIME_ERROR', ...payload }, '*');
            } catch (_) {}
          }
          window.addEventListener('error', (e) => {
            if (e.message && e.message.includes('ResizeObserver')) return;
            console.error("Preview Error:", e);
            reportError({
              message: e.message || String(e.error || 'Unknown error'),
              stack: e.error && e.error.stack ? String(e.error.stack) : null,
              filename: e.filename || null,
              lineno: e.lineno || null,
              colno: e.colno || null,
            });
          });
          window.addEventListener('unhandledrejection', (e) => {
            const reason = e.reason;
            const message = (reason && (reason.message || String(reason))) || 'Unhandled promise rejection';
            console.error("Preview Unhandled Rejection:", reason);
            reportError({
              message,
              stack: reason && reason.stack ? String(reason.stack) : null,
              filename: null,
              lineno: null,
              colno: null,
            });
          });
        })();
      </script>

      <script>
        window.__UCODE_PREVIEW_CONTEXT = { trusted: true, source: 'ugen-preview' };
      </script>

      <script type="module">
        ${bundledCode}
      </script>

      <script>
        // Wait for React to populate #root (the bundle module loads esm.sh
        // imports asynchronously, so React mount happens later than this script
        // tag is parsed). Once #root has children, force Tailwind JIT to scan
        // and only then reveal the body — prevents flash of unstyled content.
        (function() {
          var root = document.getElementById('root');
          var revealed = false;

          function reveal() {
            if (revealed) return;
            revealed = true;
            var cloak = document.getElementById('preview-cloak');
            if (cloak) cloak.remove();
            // Tell the parent the preview is on screen so it can measure the
            // srcDoc -> visible runtime half of build time (see build-timer.ts).
            try { window.parent.postMessage({ type: 'PREVIEW_READY' }, '*'); } catch (_) {}
          }

          function refreshAndReveal() {
            if (window.__TAILWIND_PREVIEW_FAILED__) {
              try {
                window.parent.postMessage({
                  type: 'PREVIEW_RUNTIME_ERROR',
                  message: 'Preview styles failed to load from ${tailwindRuntimeUrl}',
                  stack: null,
                  filename: '${tailwindRuntimeUrl}',
                  lineno: null,
                  colno: null,
                }, '*');
              } catch (_) {}
            }
            if (window.tailwind && typeof window.tailwind.refresh === 'function') {
              window.tailwind.refresh();
            }

            // Tailwind Play observes React's DOM mutations asynchronously. Wait
            // for its generated stylesheet before revealing, otherwise a large
            // app can briefly (or, if Tailwind failed, permanently) look like
            // raw serif HTML.
            var startedAt = Date.now();
            function hasGeneratedTailwindStyles() {
              if (${tailwindV4}) {
                // The v4 browser build appends compiled CSS to a <style> with no
                // marker comment — detect Tailwind's own output (its --tw-* props
                // or Preflight's text-size-adjust), absent from the preview's
                // hand-written styles.
                return Array.from(document.querySelectorAll('style')).some(function(style) {
                  var t = style.textContent || '';
                  return t.indexOf('--tw-') !== -1 || t.indexOf('text-size-adjust') !== -1;
                });
              }
              return Array.from(document.querySelectorAll('style')).some(function(style) {
                return (style.textContent || '').indexOf('tailwindcss v3.4.17') !== -1;
              });
            }
            function waitForStyles() {
              if (hasGeneratedTailwindStyles()) {
                requestAnimationFrame(function() {
                  requestAnimationFrame(reveal);
                });
                return;
              }
              if (Date.now() - startedAt < 2500) {
                setTimeout(waitForStyles, 40);
                return;
              }
              try {
                window.parent.postMessage({
                  type: 'PREVIEW_RUNTIME_ERROR',
                  message: 'Preview Tailwind runtime loaded but generated no styles',
                  stack: null,
                  filename: '${tailwindRuntimeUrl}',
                  lineno: null,
                  colno: null,
                }, '*');
              } catch (_) {}
              reveal();
            }
            waitForStyles();
          }

          if (root && root.children.length > 0) {
            refreshAndReveal();
          } else if (root) {
            var obs = new MutationObserver(function() {
              if (root.children.length > 0) {
                obs.disconnect();
                refreshAndReveal();
              }
            });
            obs.observe(root, { childList: true });
          }

          // Safety net: never keep the body hidden longer than 3s, even if
          // React never mounts (build error, network issue, etc.)
          setTimeout(reveal, 3000);
        })();
      </script>

      <script>
        ${INSPECTOR_SCRIPT}
      </script>

      <script>
        // Synthetic routing: notify parent of URL changes
        (function() {
          function notifyRoute() {
            try {
              window.parent.postMessage({
                type: 'ROUTE_CHANGE',
                url: location.pathname + location.search + location.hash
              }, '*');
            } catch (_) {}
          }
          var origPush = history.pushState.bind(history);
          var origReplace = history.replaceState.bind(history);
          history.pushState = function() { origPush.apply(history, arguments); notifyRoute(); };
          history.replaceState = function() { origReplace.apply(history, arguments); notifyRoute(); };
          window.addEventListener('popstate', notifyRoute);

          // Handle navigate messages from parent
          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'NAVIGATE' && e.data.url) {
              history.pushState({}, '', e.data.url);
            }
          });
        })();
      </script>
    </body>
    </html>
  `;
}
