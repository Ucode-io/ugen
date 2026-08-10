import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import * as esbuild from "esbuild-wasm";
import ts from "typescript";

const source = await readFile(
  new URL("./esbuildPlugin.ts", import.meta.url),
  "utf8",
);
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;
const pluginModule = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);

test("bundles imported binary assets as data URLs", async () => {
  const mp3Bytes = Buffer.from([
    0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  ]);
  const result = await esbuild.build({
    entryPoints: ["/src/main.ts"],
    bundle: true,
    write: false,
    format: "esm",
    platform: "browser",
    logLevel: "silent",
    plugins: [
      pluginModule.virtualFsPlugin({
        "/src/main.ts":
          'import ringtone from "./ringtone.mp3"; export default ringtone;',
        // Git-backed APIs commonly represent binary blobs as base64 strings.
        "/src/ringtone.mp3": mp3Bytes.toString("base64"),
      }),
    ],
  });

  const output = result.outputFiles?.[0]?.text ?? "";
  assert.match(output, /data:audio\/mpeg;base64,SUQzBA/);
});
