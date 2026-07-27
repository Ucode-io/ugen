export interface PreviewSourceFile {
  path: string;
  content?: string;
  [key: string]: unknown;
}

const SOURCE_ENTRY_NAMES = [
  "ugen-preview",
  "preview",
  "main",
  "App",
  "index",
] as const;

const SOURCE_ENTRY_EXTENSIONS = "(?:tsx|jsx|ts|js)";

/**
 * Turn API/Git paths into stable, project-relative slash paths.
 *
 * The codebase endpoint normally returns `src/App.tsx`, but historical and
 * imported repositories can return `./src/App.tsx`, Windows separators, or an
 * absolute/repository-prefixed path. Those variants must not become distinct
 * virtual-FS module identities.
 */
export function normalizePreviewFilePath(rawPath: string): string {
  const slashPath = rawPath
    .trim()
    .replace(/\0/g, "")
    .replace(/\\/g, "/")
    .replace(/^file:\/+/i, "");
  const stack: string[] = [];

  for (const part of slashPath.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      stack.pop();
      continue;
    }
    stack.push(part);
  }

  return stack.join("/");
}

const findSourceRootPrefix = (paths: string[]): string | null => {
  for (const entryName of SOURCE_ENTRY_NAMES) {
    const entryRe = new RegExp(
      `(^|/)src/${entryName}\\.${SOURCE_ENTRY_EXTENSIONS}$`,
    );
    for (const path of paths) {
      const match = path.match(entryRe);
      if (!match || match.index == null) continue;
      const srcIndex = match.index + match[1].length;
      return path.slice(0, srcIndex);
    }
  }
  return null;
};

const findPackageRootPrefix = (paths: string[]): string | null => {
  const packagePaths = paths
    .filter((path) => path === "package.json" || path.endsWith("/package.json"))
    .sort((a, b) => a.split("/").length - b.split("/").length);
  if (packagePaths.length === 0) return null;
  return packagePaths[0].slice(0, -"package.json".length);
};

const findAnySourceRootPrefix = (paths: string[]): string | null => {
  for (const path of paths) {
    const match = path.match(/(^|\/)src\//);
    if (!match || match.index == null) continue;
    const srcIndex = match.index + match[1].length;
    return path.slice(0, srcIndex);
  }
  return null;
};

const findBareEntryRootPrefix = (paths: string[]): string | null => {
  for (const entryName of SOURCE_ENTRY_NAMES) {
    const entryRe = new RegExp(
      `(^|/)${entryName}\\.${SOURCE_ENTRY_EXTENSIONS}$`,
    );
    for (const path of paths) {
      const match = path.match(entryRe);
      if (!match || match.index == null) continue;
      return path.slice(0, match.index + match[1].length);
    }
  }
  return null;
};

/**
 * Canonicalize a complete codebase response and remove a shared project-root
 * prefix when the API supplied one. Entry files are the strongest root signal,
 * followed by package.json and finally a legacy bare App/main entry.
 */
export function canonicalizePreviewFiles<T extends PreviewSourceFile>(
  files: T[],
): T[] {
  const normalized = files
    .filter((file) => typeof file?.path === "string")
    .map((file) => ({
      file,
      path: normalizePreviewFilePath(file.path),
    }))
    .filter(({ path }) => path.length > 0);
  const paths = normalized.map(({ path }) => path);
  const rootPrefix =
    findSourceRootPrefix(paths) ??
    findPackageRootPrefix(paths) ??
    findAnySourceRootPrefix(paths) ??
    findBareEntryRootPrefix(paths) ??
    "";

  return normalized.map(({ file, path }) => ({
    ...file,
    path:
      rootPrefix && path.startsWith(rootPrefix)
        ? path.slice(rootPrefix.length)
        : path,
  }));
}

const PREVIEW_APP_ENTRY_RE = /^src\/App\.(tsx|jsx|ts|js)$/;

/**
 * Keep preview readiness checks aligned with the exact path canonicalization
 * used to populate the virtual FS.
 */
export function hasPreviewEntryFile(files: Array<{ path: string }>): boolean {
  return canonicalizePreviewFiles(files).some((file) => {
    const path =
      file.path === "package.json" || file.path.startsWith("src/")
        ? file.path
        : `src/${file.path}`;
    return PREVIEW_APP_ENTRY_RE.test(path);
  });
}

/**
 * Overlay a selected microfrontend codebase on top of the project snapshot.
 *
 * `project_files` commonly carries template/static files while `/codebase`
 * carries the selected repository files. Treating either response as the whole
 * application makes preview depend on which request happened to be complete.
 * Canonical paths are used as identities and overlay files always win.
 */
export function mergePreviewFileSets<T extends PreviewSourceFile>(
  baseFiles: T[],
  overlayFiles: T[],
): T[] {
  const base = canonicalizePreviewFiles(baseFiles);
  const overlay = canonicalizePreviewFiles(overlayFiles);
  const merged = new Map<string, T>();

  for (const file of base) merged.set(file.path, file);
  for (const file of overlay) merged.set(file.path, file);

  return Array.from(merged.values());
}
