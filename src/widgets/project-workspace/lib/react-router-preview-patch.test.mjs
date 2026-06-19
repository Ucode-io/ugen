import assert from "node:assert/strict";
import test from "node:test";

import { patchReactRouterForPreview } from "./react-router-preview-patch.ts";

test("patches BrowserRouter aliases with initialEntries", () => {
  const result = patchReactRouterForPreview(`
    import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

    export default function App() {
      return (
        <Router>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </Router>
      );
    }
  `);

  assert.equal(result.patched, true);
  assert.match(
    result.content,
    /import \{ MemoryRouter as Router, Routes, Route \} from "react-router-dom";/,
  );
  assert.match(result.content, /const __UGEN_PREVIEW_INITIAL_ENTRIES = \[/);
  assert.match(
    result.content,
    /<Router initialEntries=\{__UGEN_PREVIEW_INITIAL_ENTRIES\}>/,
  );
});

test("wraps createBrowserRouter to inject the frame route, call sites unchanged", () => {
  const result = patchReactRouterForPreview(`
    import { createBrowserRouter, RouterProvider } from "react-router-dom";

    const router = createBrowserRouter([
      { path: "/", element: <DashboardPage /> },
      { path: "/login", element: <LoginPage /> },
    ]);
  `);

  assert.equal(result.patched, true);
  // createBrowserRouter dropped from the import; RouterProvider kept.
  assert.match(
    result.content,
    /import \{ RouterProvider \} from "react-router-dom";/,
  );
  // Internal memory-router import + wrapper that forces initialEntries.
  assert.match(
    result.content,
    /import \{ createMemoryRouter as __UGEN_PREVIEW_CREATE_MEMORY_ROUTER \} from "react-router-dom";/,
  );
  assert.match(result.content, /const __UGEN_PREVIEW_INITIAL_ENTRIES = \[/);
  assert.match(
    result.content,
    /const createBrowserRouter = \(routes, opts\) => __UGEN_PREVIEW_CREATE_MEMORY_ROUTER\(routes, Object\.assign\(\{\}, opts, \{ initialEntries: __UGEN_PREVIEW_INITIAL_ENTRIES \}\)\);/,
  );
  // Call site keeps the original identifier.
  assert.match(result.content, /const router = createBrowserRouter\(\[/);
});

test("wraps createHashRouter too", () => {
  const result = patchReactRouterForPreview(`
    import { createHashRouter, RouterProvider } from "react-router-dom";
    const router = createHashRouter([{ path: "/", element: <Home /> }]);
  `);

  assert.equal(result.patched, true);
  assert.match(
    result.content,
    /const createHashRouter = \(routes, opts\) => __UGEN_PREVIEW_CREATE_MEMORY_ROUTER\(/,
  );
});

test("wraps createBrowserRouter imported from the react-router package", () => {
  const result = patchReactRouterForPreview(`
    import { createBrowserRouter } from "react-router";
    import { RouterProvider } from "react-router-dom";
    const router = createBrowserRouter([{ path: "/", element: <Home /> }]);
  `);

  assert.equal(result.patched, true);
  assert.match(
    result.content,
    /const createBrowserRouter = \(routes, opts\) => __UGEN_PREVIEW_CREATE_MEMORY_ROUTER\(/,
  );
});

test("leaves unrelated react-router imports unchanged", () => {
  const source = `
    import { Link } from "react-router-dom";
    export const Nav = () => <Link to="/login">Login</Link>;
  `;

  const result = patchReactRouterForPreview(source);
  assert.deepEqual(result, { content: source, patched: false });
});
