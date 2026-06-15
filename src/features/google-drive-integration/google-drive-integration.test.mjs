import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Google Drive OAuth uses API-key auth and the configured callback routes", async () => {
  const [apiSource, callbackSource, successPage, errorPage, resourcesSource] =
    await Promise.all([
      readFile(new URL("./api/index.ts", import.meta.url), "utf8"),
      readFile(
        new URL("./ui/google-drive-callback.tsx", import.meta.url),
        "utf8",
      ),
      readFile(
        new URL(
          "../../app/[locale]/settings/google-drive-success/page.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../../app/[locale]/settings/google-drive-error/page.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
      readFile(
        new URL(
          "../../widgets/project-workspace/ui/resources-page.tsx",
          import.meta.url,
        ),
        "utf8",
      ),
    ]);

  assert.match(apiSource, /api\.get\("\/v1\/google-drive\/connect"/);
  assert.match(apiSource, /Authorization: "API-KEY"/);
  assert.match(apiSource, /"x-api-key": apiKey/);
  assert.match(apiSource, /mcp_project_id: mcpProjectId/);
  assert.match(
    resourcesSource,
    /googleDriveIntegrationApi\.getConnectUrl\(apiKey, projectId\)/,
  );
  assert.match(apiSource, /readConnectUrl\(data\.auth_url\)/);
  assert.match(callbackSource, /provider: "google-drive"/);
  assert.match(successPage, /status="success"/);
  assert.match(errorPage, /status="error"/);
  assert.match(resourcesSource, /label: 'Google Drive'/);
});
