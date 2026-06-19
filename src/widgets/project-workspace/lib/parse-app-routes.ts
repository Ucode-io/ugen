// Extracts the page list for the preview canvas by parsing the generated app's
// react-router definitions. The apps route with react-router v6 (the preview
// bundler rewrites BrowserRouter -> MemoryRouter), so pages come from either
// JSX `<Route path=... element={<X/>}/>` or the object `createBrowserRouter`
// form. This is a pragmatic regex/scan parser (not a full AST) — it only needs
// each route's path and the element component name used as the page label.

export interface AppRoute {
  /** Stable id (the normalized path). */
  id: string;
  /** Display label for the frame (element component name, else derived). */
  name: string;
  /** Route path used as MemoryRouter `initialEntries` for that frame. */
  path: string;
}

const SOURCE_EXT = /\.(tsx|ts|jsx|js)$/;

/** "/forgot-password" -> "ForgotPassword"; "/" -> "Home". */
function nameFromPath(path: string): string {
  const last = path.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean).pop();
  if (!last) return "Home";
  const pascal = last
    .replace(/^:/, "") // dynamic segment ":id" -> "id"
    .split(/[-_]/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  return pascal || "Home";
}

function normalizePath(path: string): string {
  if (!path || path === "/") return "/";
  return path.startsWith("/") ? path : "/" + path;
}

// Returns the attribute text of every `<TagName ...>` occurrence, treating `>`
// characters inside `{...}` JSX expressions or quotes as part of the tag (so
// `element={<Login />}` doesn't prematurely close the Route tag).
function extractTagAttrs(src: string, tagName: string): string[] {
  const out: string[] = [];
  const open = `<${tagName}`;
  let i = 0;
  while ((i = src.indexOf(open, i)) !== -1) {
    const after = src[i + open.length];
    // Skip false matches like `<Routes` when scanning for `<Route`.
    if (after && /[A-Za-z0-9_]/.test(after)) {
      i += open.length;
      continue;
    }
    let depth = 0;
    let quote: string | null = null;
    let j = i + open.length;
    for (; j < src.length; j++) {
      const c = src[j];
      if (quote) {
        if (c === quote) quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    out.push(src.slice(i + open.length, j));
    i = j + 1;
  }
  return out;
}

export function parseAppRoutes(
  files: Array<{ path: string; content: string }>,
): AppRoute[] {
  const found = new Map<string, AppRoute>(); // normalized path -> route

  const add = (
    rawPath: string | null,
    elementName: string | null,
    isIndex: boolean,
  ) => {
    const path = isIndex ? "/" : normalizePath(rawPath ?? "");
    if (found.has(path)) return;
    const name = elementName?.trim() || nameFromPath(path);
    found.set(path, { id: path, name, path });
  };

  for (const file of files ?? []) {
    const src = file?.content;
    if (!src || !SOURCE_EXT.test(file.path)) continue;
    if (!src.includes("Route") && !src.includes("createBrowserRouter")) continue;

    // JSX form: <Route path="..." element={<Name .../>} /> and <Route index .../>
    for (const attrs of extractTagAttrs(src, "Route")) {
      const pathMatch = attrs.match(/\bpath\s*=\s*["'`]([^"'`]*)["'`]/);
      const isIndex = /(^|\s)index(\s|=|$)/.test(attrs) && !pathMatch;
      const elMatch = attrs.match(/element\s*=\s*\{\s*<\s*([A-Z][A-Za-z0-9_]*)/);
      if (!isIndex && !pathMatch) continue; // layout/pathless wrapper route
      add(pathMatch?.[1] ?? null, elMatch?.[1] ?? null, isIndex);
    }

    // Object form: { path: "...", element: <Name /> } (createBrowserRouter)
    const objRoute =
      /path\s*:\s*["'`]([^"'`]*)["'`][^}]*?element\s*:\s*<\s*([A-Z][A-Za-z0-9_]*)/g;
    let m: RegExpExecArray | null;
    while ((m = objRoute.exec(src))) add(m[1], m[2], false);

    // Object index route: { index: true, element: <Name /> }
    const objIndex =
      /index\s*:\s*true[^}]*?element\s*:\s*<\s*([A-Z][A-Za-z0-9_]*)/g;
    while ((m = objIndex.exec(src))) add(null, m[1], true);
  }

  const routes = [...found.values()];
  // Home/index first, then discovery order.
  routes.sort((a, b) => (a.path === "/" ? -1 : b.path === "/" ? 1 : 0));

  // Never leave the canvas empty — a single-page app still has "/".
  return routes.length ? routes : [{ id: "/", name: "Home", path: "/" }];
}
