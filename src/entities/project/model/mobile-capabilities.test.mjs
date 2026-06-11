import assert from "node:assert/strict";
import test from "node:test";

import {
  INITIAL_MOBILE_SIMULATION_STATE,
  getMobileCapabilityDefinitions,
  mobileSimulationReducer,
  normalizeMobileCapabilities,
} from "./mobile-capabilities.ts";
import {
  createAndroidBuildKit,
  normalizeGeneratedMobileSource,
} from "../../../widgets/project-workspace/lib/mobile-android-build-kit.ts";

test("renders requested capability labels and exact preview statuses", () => {
  const definitions = getMobileCapabilityDefinitions("mobile", [
    "camera",
    "local_notifications",
    "push_notifications",
    "biometric_auth",
    "identity_verification",
  ]);

  assert.deepEqual(
    definitions.map(({ label, status }) => ({ label, status })),
    [
      { label: "Camera", status: "Available in preview" },
      {
        label: "Local notifications",
        status: "Available with browser permission",
      },
      { label: "Push notification", status: "Simulated in preview" },
      { label: "Biometric auth", status: "Simulated in preview" },
      { label: "Identity verification", status: "Simulated in preview" },
    ],
  );
});

test("capability UI is visible only for mobile projects", () => {
  assert.equal(
    getMobileCapabilityDefinitions("webapp", ["camera", "biometric_auth"])
      .length,
    0,
  );
  assert.equal(getMobileCapabilityDefinitions(undefined, ["camera"]).length, 0);
  assert.equal(getMobileCapabilityDefinitions("mobile", ["camera"]).length, 1);
});

test("normalizes capability payloads and ignores unsupported values", () => {
  assert.deepEqual(
    normalizeMobileCapabilities([
      "camera",
      "camera",
      "biometric_auth",
      "unsupported",
      null,
    ]),
    ["camera", "biometric_auth"],
  );
});

test("simulation interactions track push, biometric, and identity flows", () => {
  const push = mobileSimulationReducer(INITIAL_MOBILE_SIMULATION_STATE, {
    type: "open",
    capability: "push_notifications",
  });
  assert.equal(push.active, "push_notifications");
  assert.equal(mobileSimulationReducer(push, { type: "close" }).active, null);

  const biometric = mobileSimulationReducer(INITIAL_MOBILE_SIMULATION_STATE, {
    type: "open",
    capability: "biometric_auth",
  });
  const biometricSuccess = mobileSimulationReducer(biometric, {
    type: "biometric_result",
    result: "success",
  });
  assert.equal(biometricSuccess.biometricResult, "success");

  const identity = mobileSimulationReducer(INITIAL_MOBILE_SIMULATION_STATE, {
    type: "open",
    capability: "identity_verification",
  });
  const withDocument = mobileSimulationReducer(identity, {
    type: "identity_source",
    source: "passport.pdf",
  });
  const verified = mobileSimulationReducer(withDocument, {
    type: "identity_result",
    result: "simulated_verified",
  });
  assert.equal(verified.identitySource, "passport.pdf");
  assert.equal(verified.identityResult, "simulated_verified");
});

test("Android build kit adds local build tooling and missing Capacitor setup", () => {
  const kit = createAndroidBuildKit(
    [
      {
        path: "/package.json",
        content: JSON.stringify({
          scripts: { build: "vite build" },
          dependencies: { react: "^19.0.0" },
        }),
      },
      { path: "/src/App.tsx", content: "export default function App() {}" },
    ],
    {
      projectName: "Demo Mobile",
      runtimeVersion: "7.2.0",
      webDir: "dist",
      capabilities: [
        "camera",
        "local_notifications",
        "push_notifications",
        "biometric_auth",
        "identity_verification",
      ],
    },
  );
  const files = new Map(kit.map((file) => [file.path, file]));
  const packageJson = JSON.parse(files.get("package.json").content);

  assert.equal(
    packageJson.scripts["android:debug"],
    "bash scripts/build-android-debug.sh",
  );
  assert.equal(packageJson.dependencies["@capacitor/core"], "^7.2.0");
  assert.equal(packageJson.dependencies["@capacitor/android"], "^7.2.0");
  assert.equal(packageJson.dependencies["@capacitor/camera"], "^7.2.0");
  assert.equal(
    packageJson.dependencies["@capacitor/local-notifications"],
    "^7.2.0",
  );
  assert.equal(
    packageJson.dependencies["@capacitor/push-notifications"],
    "^7.2.0",
  );
  assert.equal(
    packageJson.dependencies["@capgo/capacitor-native-biometric"],
    "^7.2.0",
  );
  assert.equal(packageJson.devDependencies["@capacitor/cli"], "^7.2.0");
  assert.match(files.get("capacitor.config.ts").content, /webDir: "dist"/);
  assert.match(
    files.get("scripts/build-android-debug.sh").content,
    /\.\/gradlew assembleDebug/,
  );
  assert.match(
    files.get("scripts/prepare-android-capabilities.mjs").content,
    /android\.permission\.CAMERA/,
  );
  assert.match(
    files.get("src/lib/ugen-native-capabilities.ts").content,
    /takeNativePhoto/,
  );
  assert.match(
    files.get("src/lib/ugen-native-capabilities.ts").content,
    /scheduleNativeNotification/,
  );
  assert.match(
    files.get("src/lib/ugen-native-capabilities.ts").content,
    /registerNativePushNotifications/,
  );
  assert.match(
    files.get("src/lib/ugen-native-capabilities.ts").content,
    /authenticateWithBiometrics/,
  );
  assert.match(
    files.get("src/lib/ugen-native-capabilities.ts").content,
    /NativeBiometric\.verifyIdentity/,
  );
  assert.match(
    files.get("scripts/prepare-android-capabilities.mjs").content,
    /android\.permission\.USE_BIOMETRIC/,
  );
  assert.match(
    files.get("NATIVE_CAPABILITIES.md").content,
    /REAL OS Face ID \/ Touch ID \/ fingerprint prompt/,
  );
  assert.match(
    files.get("NATIVE_CAPABILITIES.md").content,
    /Firebase google-services\.json/,
  );
  assert.equal(
    files.get("scripts/build-android-debug.sh").unixPermissions,
    0o755,
  );
  assert.match(
    files.get("BUILD_ANDROID.md").content,
    /artifacts\/app-debug\.apk/,
  );
});

test("Android build kit wires a build-time Tailwind pipeline so the APK is styled", () => {
  const kit = createAndroidBuildKit(
    [
      {
        path: "/package.json",
        content: JSON.stringify({
          scripts: { build: "vite build" },
          dependencies: { react: "^19.0.0" },
        }),
      },
      {
        path: "/index.html",
        content:
          '<!doctype html><html><head><title>App</title></head><body><div id="root"></div></body></html>',
      },
      {
        path: "/tsconfig.json",
        content: JSON.stringify({
          references: [{ path: "./tsconfig.node.json" }],
        }),
      },
      { path: "/src/App.tsx", content: "export default function App() {}" },
    ],
    { projectName: "Demo Mobile", runtimeVersion: "7.2.0", webDir: "dist" },
  );
  const files = new Map(kit.map((file) => [file.path, file]));
  const packageJson = JSON.parse(files.get("package.json").content);

  // Build-time Tailwind toolchain is present.
  assert.ok(packageJson.devDependencies.tailwindcss);
  assert.ok(packageJson.devDependencies.postcss);
  assert.ok(packageJson.devDependencies.autoprefixer);

  // PostCSS config + Tailwind CSS entry exist and the entry pulls in Tailwind.
  assert.match(
    files.get("postcss.config.cjs").content,
    /tailwindcss[\s\S]*autoprefixer/,
  );
  assert.match(
    files.get("src/ugen-tailwind.css").content,
    /@tailwind utilities/,
  );

  // index.html loads the compiled stylesheet so Vite includes it in the build.
  assert.match(
    files.get("index.html").content,
    /<link rel="stylesheet" href="\/src\/ugen-tailwind\.css" \/>/,
  );

  // The dangling tsconfig.node.json reference is satisfied.
  assert.match(files.get("tsconfig.node.json").content, /"vite\.config\.ts"/);
});

test("Android build kit replaces the missing deprecated Vite React OXC plugin", () => {
  const kit = createAndroidBuildKit(
    [
      {
        path: "/package.json",
        content: JSON.stringify({
          scripts: { build: "vite build" },
          devDependencies: {
            vite: "^8.0.2",
            "@vitejs/plugin-react-oxc": "^0.4.3",
          },
        }),
      },
      {
        path: "/vite.config.ts",
        content:
          "import react from '@vitejs/plugin-react-oxc';\nexport default { plugins: [react()] };",
      },
      {
        path: "/src/index.css",
        content: "* { @apply border-border box-sizing-border; }",
      },
    ],
    { runtimeVersion: "8.0.0" },
  );
  const files = new Map(kit.map((file) => [file.path, file]));
  const packageJson = JSON.parse(files.get("package.json").content);

  assert.equal(
    packageJson.devDependencies["@vitejs/plugin-react-oxc"],
    undefined,
  );
  assert.equal(packageJson.devDependencies["@vitejs/plugin-react"], "^6.0.1");
  assert.doesNotMatch(
    files.get("vite.config.ts").content,
    /@vitejs\/plugin-react-oxc/,
  );
  assert.match(files.get("vite.config.ts").content, /@vitejs\/plugin-react/);
  assert.doesNotMatch(files.get("src/index.css").content, /box-sizing-border/);
  assert.match(files.get("src/index.css").content, /box-border/);
});

test("mobile source downloads normalize generated Vite and Tailwind errors", () => {
  const files = new Map(
    normalizeGeneratedMobileSource([
      {
        path: "/package.json",
        content: JSON.stringify({
          devDependencies: { "@vitejs/plugin-react-oxc": "^0.4.3" },
        }),
      },
      {
        path: "/vite.config.ts",
        content: "import react from '@vitejs/plugin-react-oxc';",
      },
      {
        path: "/src/index.css",
        content: "* { @apply box-sizing-border; }",
      },
    ]).map((file) => [file.path, file]),
  );
  const packageJson = JSON.parse(files.get("package.json").content);

  assert.equal(
    packageJson.devDependencies["@vitejs/plugin-react-oxc"],
    undefined,
  );
  assert.equal(packageJson.devDependencies["@vitejs/plugin-react"], "^6.0.1");
  assert.match(files.get("vite.config.ts").content, /@vitejs\/plugin-react/);
  assert.match(files.get("src/index.css").content, /box-border/);
});
