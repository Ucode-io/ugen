export const PREVIEW_Refresher_SCRIPT = `
  window.addEventListener("error", (e) => {
    console.error("Preview Error:", e);
  });
`;

export const INSPECTOR_SCRIPT = `
  let overlay = null;
  let overlayTag = null;
  let enabled = false;
  let lastSelected = null;
  const originalStyles = new WeakMap();

  function ensureOverlay() {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.pointerEvents = "none";
      overlay.style.zIndex = "999999";
      overlay.style.border = "1px dashed #62c0ff";
      
      overlayTag = document.createElement("div");
      overlayTag.style.position = "absolute";
      overlayTag.style.pointerEvents = "none";
      overlayTag.style.bottom = "calc(100% + 6px)";
      overlayTag.style.left = "0";
      overlayTag.style.padding = "2px 4px";
      overlayTag.style.borderRadius = "4px";
      overlayTag.style.backgroundColor = "#62c0ff";
      overlayTag.style.color = "#fff";
      overlayTag.style.fontSize = "12px";
      
      overlay.appendChild(overlayTag);

      document.body.appendChild(overlay);
    }
  }

  function getLabel(el) {
    let label = el.tagName.toLowerCase();
    if (el.id) label += "#" + el.id;
    if (el.classList.length) {
      label += "." + [...el.classList].slice(0, 2).join(".");
    }
    return label;
  }

  function highlight(el) {
    ensureOverlay(el);
    const rect = el.getBoundingClientRect();
    overlay.style.top = rect.top + "px";
    overlay.style.left = rect.left + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";

    if (el === document.documentElement || el === document.body) {
      overlay.style.display = "none";
      return;
    }
    overlay.style.display = "block";

    overlayTag.textContent = getLabel(el);
  }

  function clear() {
    overlay?.remove();
    overlay = null;
  }

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
      clear();
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

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
