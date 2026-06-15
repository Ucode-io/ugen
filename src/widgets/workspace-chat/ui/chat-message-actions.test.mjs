import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("chat messages expose feedback controls and user-only resend", async () => {
  const [bubbleSource, workspaceSource, summarySource] = await Promise.all([
    readFile(new URL("./chat-message-bubble.tsx", import.meta.url), "utf8"),
    readFile(new URL("./workspace-chat.tsx", import.meta.url), "utf8"),
    readFile(new URL("./project-summary-message.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(bubbleSource, /ThumbsUp/);
  assert.match(bubbleSource, /ThumbsDown/);
  assert.match(bubbleSource, /aria-pressed=\{feedback === "like"\}/);
  assert.match(bubbleSource, /if \(onReaction\)/);
  assert.match(bubbleSource, /onReaction\(feedback === next \? null : next\)/);
  assert.match(bubbleSource, /displayedLikeCount/);
  assert.match(bubbleSource, /displayedDislikeCount/);
  assert.match(bubbleSource, /title="Resend message"/);
  assert.match(
    workspaceSource,
    /if \(message\.role !== "user" \|\| isSending \|\| isDisabled\) return/,
  );
  assert.match(workspaceSource, /msg\.role === "user"/);
  assert.match(workspaceSource, /message\.images\?\.map\(\(url\) => \(\{ url \}\)\)/);
  assert.match(workspaceSource, /images: m\.images \?\? \(m as any\)\.image_urls \?\? \[\]/);
  assert.match(workspaceSource, /createChatMessageReaction\(message\.id, reaction\)/);
  assert.match(workspaceSource, /deleteChatMessageReaction\(message\.id\)/);
  assert.match(workspaceSource, /likeCount: normalizeMessageCount\(\(m as any\)\.like_count\)/);
  assert.match(workspaceSource, /dislikeCount: normalizeMessageCount\(\(m as any\)\.dislike_count\)/);
  assert.match(workspaceSource, /message\.role === "user"/);
  assert.match(workspaceSource, /normalizeMessageReaction\(m\)/);
  assert.match(summarySource, /onReaction=\{onReaction\}/);
  assert.match(summarySource, /likeCount=\{likeCount\}/);
  assert.match(summarySource, /dislikeCount=\{dislikeCount\}/);
});
