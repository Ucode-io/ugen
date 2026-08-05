import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const helperSource = await readFile(
  new URL("./refresh-token.ts", import.meta.url),
  "utf8",
);
const helperJavaScript = ts.transpileModule(helperSource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const {
  extractRefreshTokenData,
  getAuthorizationHeader,
  isTerminalRefreshFailure,
  usesBearerAuthorization,
} = await import(
  `data:text/javascript;base64,${Buffer.from(helperJavaScript).toString("base64")}`
);

test("extracts tokens from supported refresh response shapes", () => {
  const token = { access_token: "access-2", refresh_token: "refresh-2" };

  assert.deepEqual(
    extractRefreshTokenData({ data: { response: { token } } }),
    token,
  );
  assert.deepEqual(extractRefreshTokenData({ data: { token } }), token);
  assert.deepEqual(extractRefreshTokenData({ response: { token } }), token);
  assert.deepEqual(extractRefreshTokenData(token), token);
  assert.equal(extractRefreshTokenData({ data: {} }), null);
});

test("refresh eligibility distinguishes Bearer from project API-key requests", () => {
  assert.equal(
    usesBearerAuthorization({ Authorization: "Bearer expired-access" }),
    true,
  );
  assert.equal(
    usesBearerAuthorization({ authorization: "bearer access" }),
    true,
  );
  assert.equal(usesBearerAuthorization({ Authorization: "API-KEY" }), false);
  assert.equal(usesBearerAuthorization(undefined), false);

  const axiosHeaders = {
    get: (name) =>
      name.toLowerCase() === "authorization" ? "Bearer access" : null,
  };
  assert.equal(getAuthorizationHeader(axiosHeaders), "Bearer access");
});

test("only explicit auth rejections are terminal refresh failures", () => {
  for (const status of [400, 401, 403]) {
    assert.equal(isTerminalRefreshFailure({ response: { status } }), true);
  }
  for (const status of [408, 429, 500, 502, 503]) {
    assert.equal(isTerminalRefreshFailure({ response: { status } }), false);
  }
  assert.equal(isTerminalRefreshFailure(new Error("Network Error")), false);
});

test("token rotation bypasses project API-key interceptors", async () => {
  const source = await readFile(
    new URL("./instance.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /const refreshApi = axios\.create/);
  assert.match(source, /await refreshApi\.put\(\s*endpoint/);
  assert.doesNotMatch(source, /authApi\.put\(['"]\/v2\/refresh/);
  assert.match(source, /usesBearerAuthorization\(originalRequest\?\.headers\)/);
});
