export interface MobileSourceFile {
  path: string;
  content: string;
  unixPermissions?: number;
}

interface CreateAndroidBuildKitOptions {
  projectName?: string;
  runtimeVersion?: string;
  webDir?: string;
  capabilities?: readonly string[];
}

const OFFICIAL_CAPACITOR_PLUGIN_BY_CAPABILITY: Record<string, string> = {
  camera: "@capacitor/camera",
  local_notifications: "@capacitor/local-notifications",
  push_notifications: "@capacitor/push-notifications",
};

// Third-party (non-@capacitor/*) plugins. Capgo's biometric plugin tracks the
// Capacitor major version, so the same `version` pin used for official plugins
// applies. This drives the real OS Face ID / Touch ID / fingerprint prompt in
// the installed app — the browser preview can only simulate it.
const THIRD_PARTY_PLUGIN_BY_CAPABILITY: Record<string, string> = {
  biometric_auth: "@capgo/capacitor-native-biometric",
};

function normalizeCapabilities(capabilities?: readonly string[]) {
  return [...new Set(capabilities ?? [])].filter((capability) =>
    [
      "camera",
      "local_notifications",
      "push_notifications",
      "biometric_auth",
      "identity_verification",
    ].includes(capability),
  );
}

function createAndroidBuildScript(runtimeVersion?: string) {
  const capacitorMajor = Number.parseInt(runtimeVersion || "7", 10) || 7;
  const minimumNodeMajor = capacitorMajor >= 8 ? 22 : 20;

  return `#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required: https://nodejs.org/"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required and normally installs with Node.js."
  exit 1
fi

for JDK_HOME in \
  "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home" \
  "/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"; do
  if [ -d "$JDK_HOME" ]; then
    export JAVA_HOME="$JDK_HOME"
    export PATH="$JAVA_HOME/bin:$PATH"
    break
  fi
done

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt ${minimumNodeMajor} ]; then
  echo "Node.js ${minimumNodeMajor}+ is required for Capacitor ${capacitorMajor}."
  exit 1
fi

if ! command -v java >/dev/null 2>&1; then
  echo "Java/JDK 17+ is required before building Android."
  exit 1
fi

JAVA_VERSION="$(java -version 2>&1 | head -n 1 | sed -E 's/.*version "([^"]+)".*/\\1/')"
JAVA_MAJOR="$(echo "$JAVA_VERSION" | sed -E 's/^1\\.([0-9]+).*/\\1/; s/^([0-9]+).*/\\1/')"
if [ -z "$JAVA_MAJOR" ] || [ "$JAVA_MAJOR" -lt 17 ]; then
  echo "Java/JDK 17+ is required. Current Java version: $JAVA_VERSION"
  exit 1
fi

if [ -z "\${ANDROID_HOME:-}" ] && [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"
fi

if [ -z "\${ANDROID_HOME:-}" ] && [ -z "\${ANDROID_SDK_ROOT:-}" ]; then
  echo "Android SDK not found. Install Android Studio and configure ANDROID_HOME."
  exit 1
fi

echo "[1/5] Installing dependencies"
# Generated projects can contain temporarily mismatched optional/peer ranges
# (for example a Vite plugin whose published peer range trails Vite itself).
# The lockfile/runtime build remains authoritative for this local debug build.
npm install --legacy-peer-deps

echo "[2/5] Building the web app"
npm run build

if [ ! -d android ]; then
  echo "[3/5] Adding the Android platform"
  npx cap add android
else
  echo "[3/5] Android platform already exists"
fi

echo "[4/5] Syncing Capacitor"
npx cap sync android

echo "Preparing requested Android capabilities"
node scripts/prepare-android-capabilities.mjs

echo "[5/5] Building debug APK"
chmod +x android/gradlew
(cd android && ./gradlew assembleDebug)

mkdir -p artifacts
cp android/app/build/outputs/apk/debug/app-debug.apk artifacts/app-debug.apk

# Drop the finished APK next to the user so they don't have to dig through the
# build kit. The kit folder is only scaffolding; the APK is the deliverable.
APK_NAME="$(basename "$ROOT_DIR")-debug.apk"
DELIVERED=""
if [ -d "$HOME/Desktop" ]; then
  cp artifacts/app-debug.apk "$HOME/Desktop/$APK_NAME"
  DELIVERED="$HOME/Desktop/$APK_NAME"
fi

echo ""
echo "Android debug APK created:"
echo "$ROOT_DIR/artifacts/app-debug.apk"
if [ -n "$DELIVERED" ]; then
  echo "Delivered to your Desktop:"
  echo "$DELIVERED"
  # Reveal it in Finder on macOS; ignore on other platforms.
  if command -v open >/dev/null 2>&1; then
    open -R "$DELIVERED" >/dev/null 2>&1 || open "$HOME/Desktop" >/dev/null 2>&1 || true
  fi
fi
`;
}

function createAndroidCapabilityPreparationScript(capabilities: string[]) {
  const permissions: string[] = [];
  if (capabilities.includes("camera")) {
    permissions.push("android.permission.CAMERA");
  }
  if (capabilities.includes("biometric_auth")) {
    permissions.push("android.permission.USE_BIOMETRIC");
  }

  return `import { readFileSync, writeFileSync } from "node:fs";

const manifestPath = "android/app/src/main/AndroidManifest.xml";
let manifest = readFileSync(manifestPath, "utf8");
const permissions = ${JSON.stringify(permissions)};

for (const permission of permissions) {
  const declaration = \`<uses-permission android:name="\${permission}" />\`;
  if (!manifest.includes(\`android:name="\${permission}"\`)) {
    manifest = manifest.replace(
      /(<manifest\\b[^>]*>)/,
      \`$1\\n    \${declaration}\`,
    );
  }
}

writeFileSync(manifestPath, manifest);
console.log(
  permissions.length
    ? \`Android capability permissions ready: \${permissions.join(", ")}\`
    : "No additional Android manifest permissions requested.",
);
`;
}

function createNativeCapabilityBridge(capabilities: string[]) {
  const imports: string[] = [];
  const helpers: string[] = [];

  if (capabilities.includes("camera")) {
    imports.push(
      'import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";',
    );
    helpers.push(`export async function takeNativePhoto() {
  await Camera.requestPermissions();
  return Camera.getPhoto({
    resultType: CameraResultType.Uri,
    source: CameraSource.Camera,
    quality: 85,
  });
}`);
  }

  if (capabilities.includes("local_notifications")) {
    imports.push(
      'import { LocalNotifications } from "@capacitor/local-notifications";',
    );
    helpers.push(`export async function scheduleNativeNotification(
  title: string,
  body: string,
  delayMs = 1000,
) {
  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted") {
    throw new Error("Notification permission was not granted.");
  }
  await LocalNotifications.schedule({
    notifications: [{
      id: Date.now() % 2147483647,
      title,
      body,
      schedule: { at: new Date(Date.now() + delayMs) },
    }],
  });
}`);
  }

  if (capabilities.includes("push_notifications")) {
    imports.push(
      'import { PushNotifications } from "@capacitor/push-notifications";',
    );
    helpers.push(`export async function registerNativePushNotifications() {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") {
    throw new Error("Push notification permission was not granted.");
  }
  await PushNotifications.register();
}`);
  }

  if (capabilities.includes("biometric_auth")) {
    imports.push(
      'import { NativeBiometric } from "@capgo/capacitor-native-biometric";',
    );
    helpers.push(`export async function authenticateWithBiometrics(
  reason = "Authenticate to continue",
) {
  // Triggers the REAL OS biometric prompt (Face ID / Touch ID / fingerprint)
  // on the device. Resolves true on a successful match; rejects if biometrics
  // are unavailable or the user cancels/fails. Call this from the action that
  // should be gated behind biometrics (login, confirm payment, reveal balance).
  const available = await NativeBiometric.isAvailable();
  if (!available.isAvailable) {
    throw new Error("Biometric authentication is not available on this device.");
  }
  await NativeBiometric.verifyIdentity({
    reason,
    title: "Biometric authentication",
    subtitle: reason,
  });
  return true;
}`);
  }

  if (imports.length === 0) return null;
  return `${imports.join("\n")}

/**
 * Native helpers for requested Capacitor capabilities.
 * Import and call these functions from the matching app UI/actions.
 */
${helpers.join("\n\n")}
`;
}

function createNativeCapabilityReport(capabilities: string[]) {
  const details: Record<string, string> = {
    camera:
      "Packaged: @capacitor/camera and Android CAMERA permission. The app UI must call takeNativePhoto() or explicitly request/use WebView camera access.",
    local_notifications:
      "Packaged: @capacitor/local-notifications. The app UI must request permission and schedule notifications.",
    push_notifications:
      "Partially packaged: @capacitor/push-notifications. Real push requires Firebase google-services.json, registration listeners, and a push-sending backend.",
    biometric_auth:
      "Packaged: @capgo/capacitor-native-biometric and the Android USE_BIOMETRIC permission. The app UI must call authenticateWithBiometrics() on the action it gates (login, confirm payment, reveal balance). This runs the REAL OS Face ID / Touch ID / fingerprint prompt on the device — the in-browser preview can only simulate it.",
    identity_verification:
      "Not automatically implemented. Real identity verification requires a verification provider SDK/API, credentials, consent, and backend verification. Preview simulation is not real verification.",
  };

  const rows = capabilities.length
    ? capabilities.map(
        (capability) =>
          `- **${capability}**: ${details[capability] ?? "No native setup defined."}`,
      )
    : [
        "- No mobile capabilities were requested in `mobile_project.capabilities`.",
      ];

  return `# Native capability readiness

Installing a Capacitor plugin only packages native code. The generated app must
still call the plugin APIs from the relevant buttons/screens.

${rows.join("\n")}

For camera, local notifications, and push notification registration helpers,
import functions from:

\`\`\`ts
import {
  takeNativePhoto,
  scheduleNativeNotification,
  registerNativePushNotifications,
  authenticateWithBiometrics,
} from "./src/lib/ugen-native-capabilities";
\`\`\`

Only import helpers that exist for this project's requested capabilities.
`;
}

function sanitizePath(path: string) {
  return path.replace(/^\/+/, "");
}

function packageVersion(runtimeVersion?: string) {
  const version = runtimeVersion?.trim();
  if (!version) return "^7.0.0";
  if (/^[~^]/.test(version)) return version;
  if (/^\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
    return `^${version}`;
  }
  return "^7.0.0";
}

function appIdFromName(projectName?: string) {
  const suffix = (projectName || "mobileapp")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 40);
  return `com.ugen.${suffix || "mobileapp"}`;
}

function createCapacitorConfig(
  projectName: string | undefined,
  webDir: string,
) {
  const appName = JSON.stringify(projectName || "Mobile app");
  const outputDirectory = JSON.stringify(webDir);
  return `import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "${appIdFromName(projectName)}",
  appName: ${appName},
  webDir: ${outputDirectory},
};

export default config;
`;
}

// Generated apps use Tailwind utility classes but ship no Tailwind build of
// their own — the live preview renders them via the Tailwind Play CDN injected
// at runtime (see preview-html.ts). A standalone Vite build has no such CDN, so
// the APK rendered completely unstyled. These helpers wire a real build-time
// Tailwind v3 + PostCSS compile so the APK is self-contained and works offline.
function createPostcssConfig() {
  // `.cjs` so it loads regardless of whether package.json sets "type":"module".
  return `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

function createTailwindEntryCss() {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
}

function injectTailwindStylesheet(html: string) {
  if (html.includes("ugen-tailwind.css")) return html;
  const link = '<link rel="stylesheet" href="/src/ugen-tailwind.css" />';
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `    ${link}\n  </head>`);
  }
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/(<head[^>]*>)/i, `$1\n    ${link}`);
  }
  return `${link}\n${html}`;
}

// @vitejs/plugin-react-oxc was deprecated and generated projects can reference
// it without shipping the dependency. Normalize to the maintained React plugin
// so both local dev and APK builds load vite.config.ts reliably.
function normalizeViteReactPlugin(content: string) {
  return content.replaceAll("@vitejs/plugin-react-oxc", "@vitejs/plugin-react");
}

function normalizeGeneratedStylesheet(content: string) {
  return content.replaceAll("box-sizing-border", "box-border");
}

export function normalizeGeneratedMobileSource(
  sourceFiles: { path: string; content: string }[],
): MobileSourceFile[] {
  const files = new Map<string, MobileSourceFile>();
  for (const file of sourceFiles) {
    const path = sanitizePath(file.path);
    if (!path) continue;
    files.set(path, { path, content: file.content ?? "" });
  }

  const packageFile = files.get("package.json");
  if (packageFile) {
    try {
      const packageJson = JSON.parse(packageFile.content) as {
        devDependencies?: Record<string, string>;
      };
      if (packageJson.devDependencies?.["@vitejs/plugin-react-oxc"]) {
        delete packageJson.devDependencies["@vitejs/plugin-react-oxc"];
        packageJson.devDependencies["@vitejs/plugin-react"] ??= "^6.0.1";
        files.set("package.json", {
          path: "package.json",
          content: `${JSON.stringify(packageJson, null, 2)}\n`,
        });
      }
    } catch {
      // Keep malformed source untouched so its own tooling can report it.
    }
  }

  for (const configPath of [
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mts",
    "vite.config.mjs",
  ]) {
    const configFile = files.get(configPath);
    if (!configFile?.content.includes("@vitejs/plugin-react-oxc")) continue;
    files.set(configPath, {
      path: configPath,
      content: normalizeViteReactPlugin(configFile.content),
    });
  }

  for (const [path, file] of files) {
    if (!path.endsWith(".css") || !file.content.includes("box-sizing-border")) {
      continue;
    }
    files.set(path, {
      path,
      content: normalizeGeneratedStylesheet(file.content),
    });
  }

  return [...files.values()];
}

// tsconfig.json from generation references ./tsconfig.node.json (the standard
// Vite split) but generation does not emit it, which fails `vite build`.
function createTsconfigNode() {
  return `${JSON.stringify(
    {
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: "ESNext",
        moduleResolution: "bundler",
        allowSyntheticDefaultImports: true,
        strict: false,
      },
      include: ["vite.config.ts"],
    },
    null,
    2,
  )}\n`;
}

function createInstructions(webDir: string) {
  return `# Build the Android debug APK locally

## Requirements

- Node.js and npm
- Java/JDK 17
- Android Studio with the Android SDK installed
- \`ANDROID_HOME\` configured by Android Studio

## Build

From this project directory, run:

\`\`\`bash
chmod +x scripts/build-android-debug.sh
./scripts/build-android-debug.sh
\`\`\`

The script installs dependencies, builds the Vite web app into \`${webDir}\`,
adds/syncs the Capacitor Android project, and builds a debug APK.

The finished APK is copied to:

\`\`\`text
artifacts/app-debug.apk
\`\`\`

For convenience it is also copied to your Desktop (and revealed in Finder on
macOS) as \`<kit-folder-name>-debug.apk\`, so you can grab just the APK and
delete the rest of the kit.

Install it on a connected Android device with:

\`\`\`bash
adb install -r artifacts/app-debug.apk
\`\`\`

Debug APKs are intended for device testing and are not Play Store release builds.
`;
}

export function createAndroidBuildKit(
  sourceFiles: { path: string; content: string }[],
  options: CreateAndroidBuildKitOptions = {},
): MobileSourceFile[] {
  const files = new Map(
    normalizeGeneratedMobileSource(sourceFiles).map((file) => [
      file.path,
      file,
    ]),
  );
  const capabilities = normalizeCapabilities(options.capabilities);

  const version = packageVersion(options.runtimeVersion);
  const packageFile = files.get("package.json");
  if (packageFile) {
    try {
      const packageJson = JSON.parse(packageFile.content) as {
        scripts?: Record<string, string>;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      packageJson.scripts = {
        ...packageJson.scripts,
        "android:debug": "bash scripts/build-android-debug.sh",
      };
      packageJson.dependencies = {
        "@capacitor/core": version,
        "@capacitor/android": version,
        ...Object.fromEntries(
          capabilities
            .map(
              (capability) =>
                OFFICIAL_CAPACITOR_PLUGIN_BY_CAPABILITY[capability] ??
                THIRD_PARTY_PLUGIN_BY_CAPABILITY[capability],
            )
            .filter(Boolean)
            .map((plugin) => [plugin, version]),
        ),
        ...packageJson.dependencies,
      };
      packageJson.devDependencies = {
        "@capacitor/cli": version,
        // Build-time Tailwind so the standalone APK is styled offline. The app's
        // own pins win (spread last) if it already declares these.
        tailwindcss: "^3.4.17",
        postcss: "^8.4.49",
        autoprefixer: "^10.4.20",
        "tailwindcss-animate": "^1.0.7",
        ...packageJson.devDependencies,
      };
      if (packageJson.devDependencies["@vitejs/plugin-react-oxc"]) {
        delete packageJson.devDependencies["@vitejs/plugin-react-oxc"];
        packageJson.devDependencies["@vitejs/plugin-react"] ??= "^6.0.1";
      }
      files.set("package.json", {
        path: "package.json",
        content: `${JSON.stringify(packageJson, null, 2)}\n`,
      });
    } catch {
      // Keep malformed source untouched; the build script will surface the
      // package.json error locally instead of hiding it during download.
    }
  }

  const webDir = options.webDir?.trim() || "dist";
  if (
    !files.has("capacitor.config.ts") &&
    !files.has("capacitor.config.js") &&
    !files.has("capacitor.config.json")
  ) {
    files.set("capacitor.config.ts", {
      path: "capacitor.config.ts",
      content: createCapacitorConfig(options.projectName, webDir),
    });
  }

  // Build-time Tailwind pipeline (see helper comments). Only add the PostCSS
  // config and CSS entry if generation did not already provide them.
  if (
    !files.has("postcss.config.cjs") &&
    !files.has("postcss.config.js") &&
    !files.has("postcss.config.mjs")
  ) {
    files.set("postcss.config.cjs", {
      path: "postcss.config.cjs",
      content: createPostcssConfig(),
    });
  }
  if (!files.has("src/ugen-tailwind.css")) {
    files.set("src/ugen-tailwind.css", {
      path: "src/ugen-tailwind.css",
      content: createTailwindEntryCss(),
    });
  }
  const indexHtmlFile = files.get("index.html");
  if (indexHtmlFile) {
    files.set("index.html", {
      path: "index.html",
      content: injectTailwindStylesheet(indexHtmlFile.content),
    });
  }
  if (
    files.has("tsconfig.json") &&
    !files.has("tsconfig.node.json") &&
    files.get("tsconfig.json")?.content.includes("tsconfig.node.json")
  ) {
    files.set("tsconfig.node.json", {
      path: "tsconfig.node.json",
      content: createTsconfigNode(),
    });
  }

  files.set("scripts/build-android-debug.sh", {
    path: "scripts/build-android-debug.sh",
    content: createAndroidBuildScript(options.runtimeVersion),
    unixPermissions: 0o755,
  });
  files.set("scripts/prepare-android-capabilities.mjs", {
    path: "scripts/prepare-android-capabilities.mjs",
    content: createAndroidCapabilityPreparationScript(capabilities),
  });
  const capabilityBridge = createNativeCapabilityBridge(capabilities);
  if (capabilityBridge && !files.has("src/lib/ugen-native-capabilities.ts")) {
    files.set("src/lib/ugen-native-capabilities.ts", {
      path: "src/lib/ugen-native-capabilities.ts",
      content: capabilityBridge,
    });
  }
  files.set("NATIVE_CAPABILITIES.md", {
    path: "NATIVE_CAPABILITIES.md",
    content: createNativeCapabilityReport(capabilities),
  });
  files.set("BUILD_ANDROID.md", {
    path: "BUILD_ANDROID.md",
    content: createInstructions(webDir),
  });

  return [...files.values()];
}
