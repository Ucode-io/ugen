import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("preview styling uses the pinned local Tailwind runtimes (v3 Play + v4 browser)", () => {
  return Promise.all([
    readFile(
      new URL("./preview-html.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../../../public/tailwind-play-3.4.17.js", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../../../public/tailwindcss-browser-4.3.1.js", import.meta.url),
      "utf8",
    ),
  ]).then(([source, runtimeV3, runtimeV4]) => {
    assert.match(source, /PREVIEW_RUNTIME_VERSION = "14"/);
    assert.match(source, /TAILWIND_PLAY_RUNTIME_URL = "\/tailwind-play-3\.4\.17\.js"/);
    assert.match(source, /TAILWIND_BROWSER_V4_URL = "\/tailwindcss-browser-4\.3\.1\.js"/);
    assert.doesNotMatch(source, /src="https:\/\/cdn\.tailwindcss\.com/);
    assert.match(source, /Preview styles failed to load/);
    assert.match(source, /Preview Tailwind runtime loaded but generated no styles/);
    assert.ok(runtimeV3.length > 300_000);
    assert.ok(runtimeV4.length > 200_000);
  });
});
