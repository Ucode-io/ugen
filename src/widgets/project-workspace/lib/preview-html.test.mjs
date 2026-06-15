import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("preview styling uses the pinned local Tailwind Play runtime", () => {
  return Promise.all([
    readFile(
      new URL("./preview-html.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../../../public/tailwind-play-3.4.17.js", import.meta.url),
      "utf8",
    ),
  ]).then(([source, runtime]) => {
    assert.match(source, /PREVIEW_RUNTIME_VERSION = "5"/);
    assert.match(source, /TAILWIND_PLAY_RUNTIME_URL = "\/tailwind-play-3\.4\.17\.js"/);
    assert.doesNotMatch(source, /src="https:\/\/cdn\.tailwindcss\.com/);
    assert.match(source, /Preview styles failed to load/);
    assert.match(source, /Preview Tailwind runtime loaded but generated no styles/);
    assert.ok(runtime.length > 300_000);
  });
});
