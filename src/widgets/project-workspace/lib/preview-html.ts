export const PREVIEW_Refresher_SCRIPT = `
  window.addEventListener("error", (e) => {
    console.error("Preview Error:", e);
  });
`;

export const INSPECTOR_SCRIPT = `
  let overlay = null;
  let overlayTag = null;
  let enabled = false;

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

  document.addEventListener("click", (e) => {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    const rect = target.getBoundingClientRect();

    window.parent.postMessage({
      type: "INSPECT_SELECT",

      tag: target.tagName,
      id: target.id || null,
      className: target.className || null,
      
      name: target.getAttribute("data-element-name") || null,

      domPath: getDomPath(target),
      
      rect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }
    }, "*");
  }, true);

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
  });
`

export function generatePreviewHtml(bundledCode: string, dependenciesMap: Record<string, string> = {}) {
  const REACT_VERSION = "18.3.1";

  const depsParam = `?deps=react@${REACT_VERSION},react-dom@${REACT_VERSION}`;

  // Static imports: only React core (version must be pinned and consistent)
  const imports: Record<string, string> = {
    "react": `https://esm.sh/react@${REACT_VERSION}`,
    "react/jsx-runtime": `https://esm.sh/react@${REACT_VERSION}/jsx-runtime`,
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
      <script src="https://cdn.tailwindcss.com"></script>
      
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

      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    </head>
    <body>
      <div id="root"></div>

      <script>
        window.addEventListener('error', (e) => {
            if (e.message && e.message.includes('ResizeObserver')) return;
            console.error("Preview Error:", e);
        });
      </script>

      <script type="module">
        ${bundledCode}
      </script>

      <script>
        ${INSPECTOR_SCRIPT}
      </script>
    </body>
    </html>
  `;
}
