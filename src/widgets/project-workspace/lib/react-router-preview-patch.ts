// Match named imports from either `react-router-dom` or the underlying
// `react-router` package — v6.4+ apps import `createBrowserRouter`/`RouterProvider`
// from either, and an unpatched object router renders blank in the srcDoc iframe.
const REACT_ROUTER_IMPORT_RE =
  /import\s*\{([\s\S]*?)\}\s*from\s*(["'])(react-router(?:-dom)?)\2\s*;?/g;

const ROUTER_COMPONENT_EXPORTS = new Set(["BrowserRouter", "HashRouter"]);

// Object-router factories (`createBrowserRouter([...])` + `<RouterProvider>`).
// These read `window.location`/history when constructed, which is meaningless in
// a srcDoc iframe (its URL is `about:srcdoc`), so the app would match no route
// and render blank. We drop them from the import and define a same-named wrapper
// that calls `createMemoryRouter(routes, { ...opts, initialEntries })` — so each
// canvas frame boots the object router on its own route, call sites unchanged.
const ROUTER_FACTORY_EXPORTS = new Set([
  "createBrowserRouter",
  "createHashRouter",
]);

const INITIAL_ENTRIES_NAME = "__UGEN_PREVIEW_INITIAL_ENTRIES";
const INITIAL_ENTRIES_VALUE =
  '[(typeof window !== "undefined" && window.__PREVIEW_INITIAL_PATH__) || "/"]';
// Internal alias for the memory-router factory the wrappers delegate to.
const MEMORY_FACTORY_NAME = "__UGEN_PREVIEW_CREATE_MEMORY_ROUTER";

interface ImportSpecifier {
  imported: string;
  local: string;
}

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseSpecifier = (specifier: string): ImportSpecifier | null => {
  const trimmed = specifier.trim();
  const match = trimmed.match(
    /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/,
  );
  if (!match) return null;
  return {
    imported: match[1],
    local: match[2] ?? match[1],
  };
};

const formatSpecifier = ({ imported, local }: ImportSpecifier) =>
  imported === local ? imported : `${imported} as ${local}`;

const insertAfterImports = (source: string, insertion: string) => {
  let insertAt = 0;
  const importRe = /import[\s\S]*?from\s*(["'])[^"']+\1\s*;?\s*/g;
  let match: RegExpExecArray | null;
  while ((match = importRe.exec(source))) {
    insertAt = match.index + match[0].length;
  }
  return source.slice(0, insertAt) + insertion + source.slice(insertAt);
};

const patchRouterComponentTags = (source: string, localNames: Set<string>) => {
  let next = source;
  for (const localName of localNames) {
    const tagRe = new RegExp(
      `<${escapeRegExp(localName)}(\\s[^<>]*?)?(\\s*/?)>`,
      "g",
    );
    next = next.replace(tagRe, (match, attrs = "", closing = "") => {
      if (match.includes("initialEntries=")) return match;
      return `<${localName}${attrs} initialEntries={${INITIAL_ENTRIES_NAME}}${closing}>`;
    });
  }
  return next;
};

/**
 * React-router DOM history cannot be trusted inside a srcDoc canvas iframe:
 * each frame must boot from `window.__PREVIEW_INITIAL_PATH__`, while the iframe
 * document URL itself is usually `about:srcdoc`.
 *
 * Generated apps use a few equivalent router styles:
 *   import { BrowserRouter } ... <BrowserRouter>
 *   import { BrowserRouter as Router } ... <Router>
 *
 * Normalize component routers to MemoryRouter so every canvas frame can start
 * at its own route without re-bundling the app for each page. Object routers
 * (`createBrowserRouter`) are intentionally left untouched; the preview HTML
 * moves `window.history` before app import, which is safer than swapping router
 * factories across react-router versions.
 */
export function patchReactRouterForPreview(
  content: string,
): { content: string; patched: boolean } {
  if (!content.includes("react-router")) {
    return { content, patched: false };
  }

  const routerComponentLocals = new Set<string>();
  const routerFactoryLocals = new Set<string>();
  let patchedImports = false;

  let next = content.replace(
    REACT_ROUTER_IMPORT_RE,
    (full, specifierBody: string, quote: string, pkg: string) => {
      const nextSpecifiers: string[] = [];

      for (const rawSpecifier of specifierBody.split(",")) {
        const trimmed = rawSpecifier.trim();
        if (!trimmed) continue;

        const specifier = parseSpecifier(trimmed);
        if (!specifier) {
          nextSpecifiers.push(trimmed);
          continue;
        }

        if (ROUTER_COMPONENT_EXPORTS.has(specifier.imported)) {
          routerComponentLocals.add(specifier.local);
          nextSpecifiers.push(
            formatSpecifier({
              imported: "MemoryRouter",
              local: specifier.local,
            }),
          );
          patchedImports = true;
          continue;
        }

        if (ROUTER_FACTORY_EXPORTS.has(specifier.imported)) {
          // Drop from the import — a same-named wrapper is defined below that
          // forwards to createMemoryRouter with the frame's initialEntries.
          routerFactoryLocals.add(specifier.local);
          patchedImports = true;
          continue;
        }

        nextSpecifiers.push(trimmed);
      }

      if (nextSpecifiers.length === 0) return "";
      return `import { ${nextSpecifiers.join(", ")} } from ${quote}${pkg}${quote};`;
    },
  );

  if (!patchedImports) return { content, patched: false };

  next = patchRouterComponentTags(next, routerComponentLocals);

  const insertions: string[] = [];
  if (routerFactoryLocals.size > 0) {
    insertions.push(
      `import { createMemoryRouter as ${MEMORY_FACTORY_NAME} } from "react-router-dom";`,
    );
  }
  if (routerComponentLocals.size > 0 || routerFactoryLocals.size > 0) {
    insertions.push(`const ${INITIAL_ENTRIES_NAME} = ${INITIAL_ENTRIES_VALUE};`);
  }
  for (const local of routerFactoryLocals) {
    // Object-router opts may carry basename/future; preserve them and force the
    // frame's route. createMemoryRouter ignores any browser-only opts.
    insertions.push(
      `const ${local} = (routes, opts) => ${MEMORY_FACTORY_NAME}(routes, Object.assign({}, opts, { initialEntries: ${INITIAL_ENTRIES_NAME} }));`,
    );
  }

  if (insertions.length > 0) {
    next = insertAfterImports(next, `\n${insertions.join("\n")}\n`);
  }

  return { content: next, patched: true };
}
