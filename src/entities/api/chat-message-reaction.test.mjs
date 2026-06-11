import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("assistant message reactions use the shared API service", async () => {
  const source = await readFile(new URL("./use-chat.ts", import.meta.url), "utf8");

  assert.match(
    source,
    /api\.post\(\s*`\/v1\/ai-chat\/messages\/\$\{assistantMessageId\}\/reaction`/,
  );
  assert.match(source, /\{ reaction_type: reaction \}/);
  assert.match(
    source,
    /api\.delete\(\s*`\/v1\/ai-chat\/messages\/\$\{assistantMessageId\}\/reaction`/,
  );
});
