import assert from "node:assert/strict";
import test from "node:test";

import { parseAppRoutes } from "./parse-app-routes.ts";

const file = (content) => [{ path: "src/App.tsx", content }];

test("JSX routes: extracts path + element component name", () => {
  const routes = parseAppRoutes(
    file(`
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Routes>
    `),
  );
  assert.deepEqual(routes, [
    { id: "/", name: "Home", path: "/" },
    { id: "/login", name: "Login", path: "/login" },
    { id: "/forgot-password", name: "ForgotPassword", path: "/forgot-password" },
  ]);
});

test("index route maps to '/' and uses its element name", () => {
  const routes = parseAppRoutes(
    file(`<Route index element={<Dashboard />} /><Route path="/x" element={<X/>}/>`),
  );
  assert.equal(routes[0].path, "/");
  assert.equal(routes[0].name, "Dashboard");
});

test("element-before-path ordering still captures both (brace-aware scan)", () => {
  const routes = parseAppRoutes(
    file(`<Route element={<Settings />} path="/settings" />`),
  );
  assert.deepEqual(routes, [
    { id: "/settings", name: "Settings", path: "/settings" },
  ]);
});

test("createBrowserRouter object form", () => {
  const routes = parseAppRoutes(
    file(`
      const router = createBrowserRouter([
        { path: "/", element: <Home /> },
        { path: "/register", element: <Register /> },
      ]);
    `),
  );
  assert.deepEqual(routes.map((r) => r.path), ["/", "/register"]);
  assert.equal(routes.find((r) => r.path === "/register").name, "Register");
});

test("relative paths are normalized and duplicates de-duped", () => {
  const routes = parseAppRoutes(
    file(`
      <Route path="reset-password" element={<ResetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    `),
  );
  assert.deepEqual(routes, [
    { id: "/reset-password", name: "ResetPassword", path: "/reset-password" },
  ]);
});

test("derives a name from the path when no element is given", () => {
  const routes = parseAppRoutes(file(`<Route path="/user-profile" />`));
  assert.equal(routes[0].name, "UserProfile");
});

test("no routes found -> single Home fallback", () => {
  assert.deepEqual(parseAppRoutes(file(`export const App = () => null`)), [
    { id: "/", name: "Home", path: "/" },
  ]);
  assert.deepEqual(parseAppRoutes([]), [{ id: "/", name: "Home", path: "/" }]);
});

test("ignores <Routes> wrapper and pathless layout routes", () => {
  const routes = parseAppRoutes(
    file(`
      <Routes>
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
        </Route>
      </Routes>
    `),
  );
  assert.deepEqual(routes.map((r) => r.path), ["/home"]);
});
