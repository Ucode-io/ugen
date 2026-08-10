import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(
  new URL("./preview-file-paths.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const pathsModule = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

const {
  canonicalizePreviewFiles,
  hasPreviewEntryFile,
  mergePreviewFileSets,
} = pathsModule;
const file = (path) => ({ path, content: `// ${path}` });

test("keeps normal project-relative paths stable", () => {
  const result = canonicalizePreviewFiles([
    file("package.json"),
    file("src/main.tsx"),
    file("src/App.tsx"),
    file("src/pages/Dashboard.tsx"),
  ]);

  assert.deepEqual(
    result.map(({ path }) => path),
    [
      "package.json",
      "src/main.tsx",
      "src/App.tsx",
      "src/pages/Dashboard.tsx",
    ],
  );
  assert.equal(hasPreviewEntryFile(result), true);
});

test("normalizes dot segments and Windows separators", () => {
  const result = canonicalizePreviewFiles([
    file(".\\package.json"),
    file(".\\src\\main.tsx"),
    file(".\\src\\screens\\..\\App.tsx"),
  ]);

  assert.deepEqual(
    result.map(({ path }) => path),
    ["package.json", "src/main.tsx", "src/App.tsx"],
  );
  assert.equal(hasPreviewEntryFile(result), true);
});

test("strips a repository-name prefix from codebase paths", () => {
  const result = canonicalizePreviewFiles([
    file("professio_app_69f844/package.json"),
    file("professio_app_69f844/src/main.tsx"),
    file("professio_app_69f844/src/App.tsx"),
    file("professio_app_69f844/src/pages/Dashboard.tsx"),
  ]);

  assert.deepEqual(
    result.map(({ path }) => path),
    [
      "package.json",
      "src/main.tsx",
      "src/App.tsx",
      "src/pages/Dashboard.tsx",
    ],
  );
  assert.equal(hasPreviewEntryFile(result), true);
});

test("strips an absolute project prefix from codebase paths", () => {
  const result = canonicalizePreviewFiles([
    file("/workspace/professio_app_69f844/package.json"),
    file("/workspace/professio_app_69f844/src/main.tsx"),
    file("/workspace/professio_app_69f844/src/App.tsx"),
  ]);

  assert.deepEqual(
    result.map(({ path }) => path),
    ["package.json", "src/main.tsx", "src/App.tsx"],
  );
  assert.equal(hasPreviewEntryFile(result), true);
});

test("continues to support legacy bare App paths", () => {
  const result = canonicalizePreviewFiles([
    file("App.tsx"),
    file("pages/Dashboard.tsx"),
  ]);

  assert.deepEqual(
    result.map(({ path }) => path),
    ["App.tsx", "pages/Dashboard.tsx"],
  );
  assert.equal(hasPreviewEntryFile(result), true);
});

test("fills an incomplete codebase from project files and keeps codebase overrides", () => {
  const result = mergePreviewFileSets(
    [
      file("src/App.tsx"),
      { path: "src/pages/Dashboard.tsx", content: "// saved" },
      file("src/components/ui/button.tsx"),
    ],
    [
      {
        path: "professio_app_69f844/src/pages/Dashboard.tsx",
        content: "// selected codebase",
      },
    ],
  );

  assert.equal(hasPreviewEntryFile(result), true);
  assert.equal(
    result.find(({ path }) => path === "src/pages/Dashboard.tsx")?.content,
    "// selected codebase",
  );
  assert.ok(
    result.some(({ path }) => path === "src/components/ui/button.tsx"),
  );
});
