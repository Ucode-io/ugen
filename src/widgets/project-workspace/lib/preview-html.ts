import { previewOptimizationsEnabled } from "./preview-flags";

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
`

export function generatePreviewHtml(bundledCode: string, dependenciesMap: Record<string, string> = {}, files: Array<{ path: string; content: string }> = []) {
  const REACT_VERSION = "18.3.1";

  const tailwindConfigFile = files.find(f => f.path === "tailwind.config.js");

  let tailwindConfigJson = "{}";
  if (tailwindConfigFile) {
    try {
      // Убираем export default и require() — выполняем как выражение
      const configStr = tailwindConfigFile.content
        .replace(/\/\*[\s\S]*?\*\//g, "")           // убираем JSDoc комментарии
        .replace(/export\s+default\s+/, "")          // убираем export default
        .replace(/require\([^)]+\)/g, "{}")          // убираем require()
        .trim()
        .replace(/;$/, "");                          // убираем точку с запятой в конце

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

  // IMPORTANT: keep `?deps=react@…,react-dom@…` on every esm.sh URL. It pins all
  // packages to a single /react@18.3.1/…/react.mjs instance — dropping it (or
  // switching to ?bundle/?standalone) reintroduces a second React graph and
  // "Invalid hook call". Exact versions also avoid 302 redirects from esm.sh.
  const depsParam = `?deps=react@${REACT_VERSION},react-dom@${REACT_VERSION}`;

  // Static imports: only React core (version must be pinned and consistent)
  const imports: Record<string, string> = {
    "react": `https://esm.sh/react@${REACT_VERSION}`,
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
    if (name === "tailwindcss-animate" || name === "tailwindcss" || name === "autoprefixer" || name === "postcss") return;

    const version = versionSpec.replace(/[\^~]/, "") || "latest";

    // For Radix UI packages, we need sub-path exports to work
    // esm.sh handles this automatically when version is specified
    imports[name] = `https://esm.sh/${name}@${version}${depsParam}`;
  });

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
    if (specifier.startsWith(".") || specifier.startsWith("/") || specifier.startsWith("http")) continue;

    // Extract the package name (handles @scope/package/subpath)
    const pkgName = specifier.startsWith("@")
      ? specifier.split("/").slice(0, 2).join("/")
      : specifier.split("/")[0];

    const versionSpec = dependenciesMap[pkgName];
    if (versionSpec) {
      const cleanVersion = versionSpec.replace(/[\^~]/, "") || "latest";
      // Build the sub-path URL: e.g. zustand@5.0.0/middleware?deps=...
      const subPath = specifier.slice(pkgName.length); // e.g. "/middleware"
      imports[specifier] = `https://esm.sh/${pkgName}@${cleanVersion}${subPath}${depsParam}`;
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
        `<link rel="preconnect" href="https://cdn.tailwindcss.com">`,
        ...Object.entries(imports)
          .filter(([spec]) => spec !== "react/jsx-dev-runtime")
          .map(([, url]) => `<link rel="modulepreload" href="${url}" crossorigin>`),
      ].join("\n      ")
    : "";

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      ${warmupHead}
      <!-- Конфиг ПОСЛЕ загрузки CDN через tailwind.config -->
      <script src="https://cdn.tailwindcss.com"></script>
      <script>
        tailwind.config = ${tailwindConfigJson};
      </script>
      
      <script>
        window.process = { env: { NODE_ENV: 'production' } };
      </script>

      <script type="importmap">
        ${JSON.stringify({ imports }, null, 2)}
      </script>

      <style>
        html, body, #root { height: 100%; margin: 0; padding: 0; }

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
          function reportError(payload) {
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
            if (window.tailwind && typeof window.tailwind.refresh === 'function') {
              window.tailwind.refresh();
            }
            requestAnimationFrame(function() {
              requestAnimationFrame(reveal);
            });
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
