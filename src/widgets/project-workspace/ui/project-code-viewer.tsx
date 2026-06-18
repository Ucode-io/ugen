"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Editor from "@monaco-editor/react";
import {
  CodeSidebar,
  CodeEditorTabs,
  CodeActionBar,
  CodeEmptyState,
  buildFileTree,
} from "./code-viewer-ui";
import { toast } from "sonner";
import { useFilesStore, IFile } from "@/entities/project/model/files-store";
import { useUIStore } from "@/shared/model/theme/use-ui-store";
import { api } from "@/shared/api";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/entities/session";
import type { CodeEditorTarget } from "@/entities/session";
import { useCodeSelectionStore } from "@/entities/project/model/code-selection-store";
import { CodebaseEditor } from "./codebase-editor";
import type { CodebaseFile } from "./codebase-editor";
import { EditorDropdown, FRONTEND_VALUE } from "./editor-dropdown";
import type { DropdownOption } from "./editor-dropdown";
import { getDirtyKey, useDirtyFilesStore } from "@/entities/project/model/dirty-files-store";
import { useGuardedAction, requestSave } from "../lib/save-flow";
import { cn } from "@/shared/lib/utils/cn";

// Internal/system function hidden from the editor dropdown — mirrors the same
// exclusion applied to the functions list in functions-page.tsx.
const HIDDEN_FUNCTION_ID = 'b90d8ad8-553a-4494-8031-660b85a79b45';

// ── Component ───────────────────────────────────────────────────────────────
export const ProjectCodeViewer = ({
  projectId,
  getLanguageByPath,
  versionFiles,
  isChatCollapsed = false,
  chatPosition = 'left',
}: {
  projectId: string;
  getLanguageByPath: (path: string) => string;
  versionFiles?: { path: string; content: string }[] | null;
  isChatCollapsed?: boolean;
  chatPosition?: 'left' | 'right';
}) => {
  // ── Files store ────────────────────────────────────────────────────────────
  const files = useFilesStore((state) => state.files);
  const activeFile = useFilesStore((state) => state.activeFile);
  const openedFiles = useFilesStore((state) => state.openedFiles);
  const expandedFolders = useFilesStore((state) => state.expandedFolders);
  const updatedFiles = useFilesStore((state) => state.updatedFiles);
  const setActiveFile = useFilesStore((state) => state.setActiveFile);
  const setOpenedFiles = useFilesStore((state) => state.setOpenedFiles);
  const setExpandedFolders = useFilesStore((state) => state.setExpandedFolders);
  const setUpdatedFiles = useFilesStore((state) => state.setUpdatedFiles);
  const updateFile = useFilesStore((state) => state.updateFile);

  // ── Dropdown state ─────────────────────────────────────────────────────────
  const [selectedValue, setSelectedValue] = useState<string>(FRONTEND_VALUE);

  // Read pending target from store (set by </> Edit button) and auto-select it
  const codeEditorTarget = useAuthStore((state) => state.codeEditorTarget);
  const setCodeEditorTarget = useAuthStore((state) => state.setCodeEditorTarget);
  const activeCodeSelection = useCodeSelectionStore((state) => state.activeCodeSelection);
  const activeCodeFiles = useCodeSelectionStore((state) => state.activeCodeFiles);
  const setActiveCodeSelection = useCodeSelectionStore((state) => state.setActiveCodeSelection);
  const apiKey = useAuthStore((state) => state.apiKey);

  // ── Codebase state (for microfrontend / function mode) ────────────────────
  const [codebaseFiles, setCodebaseFiles] = useState<CodebaseFile[]>([]);
  const [isLoadingCodebase, setIsLoadingCodebase] = useState(false);

  // ── API Queries for dropdown options ──────────────────────────────────────
  const { data: microfrontendsData = [], isFetched: microfrontendsFetched } = useQuery({
    queryKey: ['microfrontends-dropdown', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v2/functions/micro-frontend', {
        params: { search: '', offset: 0, limit: 50, 'project-id': projectId },
        headers: {
          'Authorization': `API-KEY`,
          'x-api-key': apiKey
        }
      });
      return (data.data?.functions ?? []) as Array<{
        id: string; name: string; path: string; branch?: string;
        type: string; project_id?: string; repo_id?: string; url?: string;
      }>;
    },
    enabled: !!projectId,
    staleTime: 0,
  });

  const { data: functionsData = [], isFetched: functionsFetched } = useQuery({
    queryKey: ['functions-dropdown', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v1/function', {
        params: { search: '', limit: 50, offset: 0, 'project-id': projectId },
        headers: {
          'Authorization': `API-KEY`,
          'x-api-key': apiKey
        }
      });
      return (data.data?.functions ?? []) as Array<{
        id: string; name: string; path?: string; branch?: string;
        type: string; repo_id?: string;
      }>;
    },
    enabled: !!projectId,
    staleTime: 0,
  });

  // Build the full option list
  const dropdownOptions = useMemo<DropdownOption[]>(() => [
    ...microfrontendsData.map((mf) => ({
      value: `mf__${mf.id}`,
      label: mf.name,
      group: 'microfrontend' as const,
      target: {
        kind: 'microfrontend' as const,
        id: mf.id,
        name: mf.name,
        path: mf.path,
        branch: mf.branch ?? 'master',
        type: mf.type,
        repoId: mf.repo_id,
        url: mf.url,
        projectId: mf.project_id,
      },
    })),
    ...functionsData
      .filter((fn) => fn.id !== HIDDEN_FUNCTION_ID)
      .map((fn) => ({
        value: `fn__${fn.id}`,
        label: fn.name,
        group: 'function' as const,
        target: {
          kind: 'function' as const,
          id: fn.id,
          name: fn.name,
          path: fn.path,
          branch: fn.branch ?? 'master',
          type: fn.type,
          repoId: fn.repo_id,
        },
      })),
  ], [microfrontendsData, functionsData]);

  // Both dropdown queries have settled (success or error). Used as the "options
  // loaded" signal — counting `dropdownOptions.length` is wrong because a
  // project with a single microfrontend never exceeds 1 entry, which would
  // leave the matching effects waiting forever.
  const optionsReady = microfrontendsFetched && functionsFetched;

  // Auto-select when codeEditorTarget arrives from the store.
  // We also re-run whenever dropdownOptions changes (API data loads) so we can
  // match even if the queries finish after the tab switch.
  useEffect(() => {
    if (!codeEditorTarget) return;
    const match = dropdownOptions.find(
      (o) => o.target.kind === codeEditorTarget.kind && o.target.id === codeEditorTarget.id
    );
    if (match) {
      setSelectedValue(match.value);
      setCodeEditorTarget(null); // consumed
    } else if (optionsReady) {
      // Options loaded but item not found — still clear to avoid stale state
      setCodeEditorTarget(null);
    }
    // If options not yet loaded, keep codeEditorTarget in store and retry on next render
  }, [codeEditorTarget, dropdownOptions, optionsReady, setCodeEditorTarget]);

  // The currently active dropdown selection
  const activeOption = useMemo(
    () => dropdownOptions.find((o) => o.value === selectedValue) ?? dropdownOptions[0],
    [dropdownOptions, selectedValue]
  );

  const isGitlabMode = activeOption?.target?.kind !== 'frontend';

  // ── Keep the dropdown in sync with activeCodeSelection (set externally, e.g.
  // from chat-input or the preview header). Stays reactive so switching the
  // microfrontend elsewhere is reflected here too — the code viewer now stays
  // mounted across tab switches, so a one-shot sync would go stale.
  // User-initiated changes go through handleDropdownChange, which writes the
  // same selection back to the store, so this never fights the user.
  useEffect(() => {
    // Selection not resolved yet (auto-select still in flight) — wait.
    if (!activeCodeSelection) return;
    // Frontend selection: fall back to the default FRONTEND_VALUE.
    if (activeCodeSelection.kind === 'frontend') {
      setSelectedValue(FRONTEND_VALUE);
      return;
    }
    // Wait until the dropdown queries have settled before trying to match.
    if (!optionsReady) return;
    const match = dropdownOptions.find(
      (o) => o.target.kind === activeCodeSelection.kind && o.target.id === activeCodeSelection.id
    );
    if (match) {
      setSelectedValue(match.value);
    }
  }, [activeCodeSelection, dropdownOptions, optionsReady]);

  const guardedAction = useGuardedAction();

  // Dirty state for gitlab mode (microfrontend/function)
  const dirtyKey = getDirtyKey(activeOption?.target ?? null);
  const dirtyMap = useDirtyFilesStore((s) => (dirtyKey ? s.dirty[dirtyKey] : undefined));
  const gitlabHasDirty = !!dirtyMap && Object.keys(dirtyMap).length > 0;
  const handleSaveAll = () => {
    void requestSave(activeOption?.target ?? null).catch(() => { /* cancelled */ });
  };

  // Wrap setSelectedValue so every user-initiated dropdown change also updates the store.
  // Guard: if there are unsaved changes for the currently selected microfrontend, prompt first.
  const handleDropdownChange = (value: string) => {
    if (value === selectedValue) return;
    guardedAction(() => {
      setSelectedValue(value);
      const option = dropdownOptions.find((o) => o.value === value);
      if (option?.target) {
        // When the new selection points at the target we're already showing,
        // the codebase-fetch effect won't re-run (its id dependency is
        // unchanged), so hand it the files we already have. Passing the target
        // alone resets activeCodeFiles to null and the preview would spin
        // forever on "fetching codebase". For a genuinely different target,
        // null is correct — the fetch effect re-runs and repopulates.
        const sameTarget = activeOption?.target?.id === option.target.id;
        setActiveCodeSelection(
          option.target,
          sameTarget && codebaseFiles.length > 0 ? codebaseFiles : null,
        );
      }
    });
  };

  // Fetch codebase files when a microfrontend/function is selected
  useEffect(() => {
    if (!isGitlabMode) {
      setCodebaseFiles([]);
      return;
    }
    const target = activeOption?.target;
    const id = target?.id;
    if (!id || !target) return;

    // Reuse files already loaded by the preview tab (same target) — avoids the
    // visible re-fetch when entering the code view for the first time.
    if (
      activeCodeSelection?.kind === target.kind &&
      activeCodeSelection.id === id &&
      activeCodeFiles &&
      activeCodeFiles.length > 0
    ) {
      setCodebaseFiles(
        activeCodeFiles.map(({ path, content }) => ({ path, content })),
      );
      setIsLoadingCodebase(false);
      return;
    }

    setIsLoadingCodebase(true);
    const headers = apiKey ? { Authorization: 'API-KEY', 'x-api-key': apiKey } : {};
    api
      .get(`/v2/function/${id}/codebase`, {
        params: { 'project-id': projectId },
        headers,
      })
      .then(({ data }) => {
        const files = (data?.data?.files ?? []) as CodebaseFile[];
        setCodebaseFiles(files);
        // Also update the store so preview tab can read the files without re-fetching
        setActiveCodeSelection(target, files);
      })
      .catch(console.error)
      .finally(() => setIsLoadingCodebase(false));
  }, [activeOption?.target?.id, isGitlabMode, projectId]);

  // ── Editor state ───────────────────────────────────────────────────────────
  const [sidebarMode, setSidebarMode] = useState<"explorer" | "search">(
    "explorer",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const openFolders = useMemo(
    () => new Set(expandedFolders),
    [expandedFolders],
  );

  const { theme } = useUIStore();
  const [mounted, setMounted] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted && theme === "dark" ? "vs-dark" : "vs";

  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme("vscode-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#1e1e1e",
        "editor.lineHighlightBackground": "#2a2d2e",
        "editorCursor.foreground": "#aeafad",
        "editor.selectionBackground": "#264f78",
        "editor.inactiveSelectionBackground": "#3a3d41",
      },
    });
    monaco.editor.setTheme(currentTheme);
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      allowSyntheticDefaultImports: true,
      reactNamespace: "React",
      allowJs: true,
      typeRoots: ["node_modules/@types"],
      baseUrl: "file:///",
      paths: {
        "@/*": ["file:///src/*"],
      },
      strict: true,
      checkJs: true,
      lib: ["esnext", "dom", "dom.iterable"],
    });

    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      'declare module "react/jsx-runtime" { export default any; }',
      "file:///node_modules/@types/react/jsx-runtime.d.ts",
    );
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      "declare var React: any;",
      "file:///node_modules/@types/react/index.d.ts",
    );

    // ATA (Automatic Type Acquisition) fetches @types/* for imported packages to
    // enrich autocomplete. It needs the full TypeScript compiler (~7 MB), so we
    // load it — and @typescript/ata — lazily after the editor mounts instead of
    // bundling them into the code-viewer chunk. The editor is fully usable before
    // types arrive; `triggerAta` stays a no-op until they land, then we seed it
    // with the already-open models so types resolve without requiring an edit.
    let triggerAta: (content: string) => void = () => {};
    void Promise.all([import("typescript"), import("@typescript/ata")])
      .then(([ts, ata]) => {
        const acquire = ata.setupTypeAcquisition({
          projectName: "ugen-workspace",
          typescript: (ts as any).default ?? ts,
          logger: console,
          delegate: {
            receivedFile: (code, path) => {
              monaco.languages.typescript.typescriptDefaults.addExtraLib(
                code,
                `file:///${path}`,
              );
            },
          },
        });
        triggerAta = (content: string) => acquire(content);
        monaco.editor
          .getModels()
          .forEach((m: any) => triggerAta(m.getValue()));
      })
      .catch(() => {});

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    files.forEach((file) => {
      try {
        const path = file.path.startsWith("src/")
          ? file.path
          : `src/${file.path}`;
        const uri = monaco.Uri.parse(`file:///${path}`);
        if (!monaco.editor.getModel(uri)) {
          monaco.editor.createModel(
            file.content || "",
            file.language || "typescript",
            uri,
          );
        }
        if (file.content) {
          triggerAta(file.content);
        }
      } catch (err) {
        console.warn(`[Monaco] Failed to create model for ${file.path}:`, err);
      }
    });

    editor.onDidChangeModelContent(() => {
      triggerAta(editor.getValue());
    });

    editor.addAction({
      id: "format-with-prettier",
      label: "Format Document",
      keybindings: [
        monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF,
      ],
      run: async () => {
        const val = editor.getValue();
        try {
          // Prettier + its babel/estree plugins load only when the user actually
          // formats, keeping them out of the code-viewer chunk.
          const [prettier, babelPlugin, estreePlugin] = await Promise.all([
            import("prettier/standalone").then((m) => m.default),
            import("prettier/plugins/babel").then((m) => m.default),
            import("prettier/plugins/estree").then((m) => m.default),
          ]);
          const formatted = await prettier.format(val, {
            parser: "babel",
            plugins: [babelPlugin, estreePlugin],
            singleQuote: true,
          });
          editor.executeEdits("prettier", [
            {
              range: editor.getModel().getFullModelRange(),
              text: formatted,
              forceMoveMarkers: true,
            },
          ]);
        } catch (err) {
          console.error("Format failed", err);
        }
      },
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      () => {
        setSidebarMode("search");
        setSearchQuery("");
      },
    );
  };

  // Handle initial opened files if activeFile is set but not in openedFiles
  useEffect(() => {
    if (activeFile && !openedFiles.includes(activeFile)) {
      setOpenedFiles([...openedFiles, activeFile]);
    }
  }, [activeFile, openedFiles, setOpenedFiles]);

  useEffect(() => {
    if (!monacoRef.current) return;
    const monaco = monacoRef.current;
    const currentUris = new Set<string>();

    files.forEach((file) => {
      try {
        const path = file.path.startsWith("src/")
          ? file.path
          : `src/${file.path}`;
        const uri = monaco.Uri.parse(`file:///${path}`);
        currentUris.add(uri.toString());
        const model = monaco.editor.getModel(uri);
        if (!model) {
          monaco.editor.createModel(
            file.content || "",
            file.language || "typescript",
            uri,
          );
        } else if (
          model.getValue() !== file.content &&
          file.path !== activeFile
        ) {
          model.setValue(file.content || "");
        }
      } catch (err) {
        console.warn(`[Monaco] Failed to update model for ${file.path}:`, err);
      }
    });

    monaco.editor.getModels().forEach((model: any) => {
      if (
        model.uri.path !== "/package.json" &&
        !currentUris.has(model.uri.toString())
      ) {
        model.dispose();
      }
    });
  }, [files, activeFile]);

  // Use refs to avoid stale closures in event listeners and Monaco commands
  const activeFileRef = useRef(activeFile);
  const updatedFilesRef = useRef(updatedFiles);
  const projectIdRef = useRef(projectId);

  useEffect(() => {
    activeFileRef.current = activeFile;
    updatedFilesRef.current = updatedFiles;
    projectIdRef.current = projectId;
  }, [activeFile, updatedFiles, projectId]);

  const handleSave = () => {
    const currentActiveFile = activeFileRef.current;

    if (editorRef.current) {
      const val = editorRef.current.getValue();
      updateFile(currentActiveFile, val);
      setUpdatedFiles(
        updatedFilesRef.current.filter((f) => f.path !== currentActiveFile),
      );

      api.put(`/v1/mcp_project/${projectIdRef.current}`, {
        project_id: projectIdRef.current,
        project_files: [
          {
            path: currentActiveFile,
            content: val,
            language: getLanguageByPath(currentActiveFile),
          },
        ],
      });
    }
  };

  const handleSaveAllFiles = () => {
    const allDirty = updatedFilesRef.current;
    if (allDirty.length === 0) return;
    allDirty.forEach((f) => updateFile(f.path, f.content));
    setUpdatedFiles([]);
    api.put(`/v1/mcp_project/${projectIdRef.current}`, {
      project_id: projectIdRef.current,
      project_files: allDirty.map((f) => ({
        path: f.path,
        content: f.content,
        language: f.language,
      })),
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      const currentActiveFile = activeFileRef.current;
      setUpdatedFiles([
        ...updatedFilesRef.current,
        {
          path: currentActiveFile,
          content: value,
          language: getLanguageByPath(currentActiveFile),
        },
      ]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const openFile = (path: string) => {
    if (!openedFiles.includes(path)) setOpenedFiles([...openedFiles, path]);
    console.log({ path });
    setActiveFile(path);
  };

  const closeFile = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    const newOpened = openedFiles.filter((p) => p !== path);
    setOpenedFiles(newOpened);
    if (activeFile === path)
      setActiveFile(
        newOpened.length > 0 ? newOpened[newOpened.length - 1] : "",
      );
  };

  const jumpToLine = (path: string, lineNumber: number, column: number) => {
    openFile(path);
    setTimeout(() => {
      try {
        if (editorRef.current) {
          editorRef.current.revealLineInCenter(lineNumber);
          editorRef.current.setPosition({ lineNumber, column });
          editorRef.current.focus();
        }
      } catch (err) {
        console.warn(`[Monaco] Failed to jump to line ${lineNumber}:`, err);
      }
    }, 100);
  };

  const toggleFolder = (path: string) => {
    const next = new Set(openFolders);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setExpandedFolders(Array.from(next));
  };

  const fileTree = useMemo(() => buildFileTree(files), [files]);

  // ── Import ZIP (download project code as a .zip to user's PC) ─────────────
  const [isImporting, setIsImporting] = useState(false);

  const handleImportZip = async () => {
    const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._-]+/g, "_") || "project";

    const sourceFiles: { path: string; content: string }[] = isGitlabMode
      ? codebaseFiles
      : files.map((f) => ({ path: f.path, content: f.content ?? "" }));

    if (sourceFiles.length === 0) {
      toast.error("No files to download");
      return;
    }

    const archiveName = isGitlabMode
      ? sanitize(activeOption?.target?.name ?? "codebase")
      : sanitize(`project-${projectId}`);

    setIsImporting(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      sourceFiles.forEach(({ path, content }) => {
        zip.file(path, content ?? "");
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${archiveName}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${archiveName}.zip`);
    } catch (err) {
      console.error("[ImportZIP] Failed to build archive:", err);
      toast.error("Failed to build ZIP archive");
    } finally {
      setIsImporting(false);
    }
  };

  const canImport = isGitlabMode ? codebaseFiles.length > 0 : files.length > 0;


  // Perform Search
  const globalSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const results: any[] = [];
    const q = searchQuery.toLowerCase();

    files.forEach((file) => {
      const lines = file.content?.split("\n");
      lines?.forEach((line, index) => {
        const matchCol = line.toLowerCase().indexOf(q);
        if (matchCol !== -1) {
          results.push({
            file,
            lineNumber: index + 1,
            matchLine: line.trim(),
            matchCol: matchCol + 1,
            queryLength: searchQuery.length,
          });
        }
      });
    });
    return results;
  }, [files, searchQuery]);



  const activeFileObj = files.find((f) => f.path === activeFile);



  return (
    <div className={cn(
      "flex-1 flex justify-center items-start h-full overflow-hidden transition-all duration-300",
      "pb-2",
      chatPosition === 'left' ? (isChatCollapsed ? "px-4" : "pr-4 pl-0") : (isChatCollapsed ? "px-4" : "pl-4 pr-0"),
    )}>
    <div className="flex flex-col w-full h-full overflow-hidden border border-border-subtle shadow-md text-[13px]" style={{ borderRadius: '12px' }}>
      <EditorDropdown
        selectedValue={selectedValue}
        setSelectedValue={handleDropdownChange}
        dropdownOptions={dropdownOptions}
        hasMicrofrontends={microfrontendsData.length > 0}
        hasFunctions={functionsData.length > 0}
        isGitlabMode={isGitlabMode}
        onImportZip={handleImportZip}
        isImporting={isImporting}
        canImport={canImport}
        onSave={isGitlabMode ? handleSaveAll : handleSaveAllFiles}
        hasDirty={isGitlabMode ? gitlabHasDirty : updatedFiles.length > 0}
      />

      {isGitlabMode ? (
        <div className="flex-1 overflow-hidden flex">
          <CodebaseEditor
            key={versionFiles ? 'version' : selectedValue}
            files={versionFiles ?? codebaseFiles}
            isLoading={isLoadingCodebase && !versionFiles}
            name={activeOption?.target?.name}
            branch={activeOption?.target?.branch}
            dirtyKey={versionFiles ? null : getDirtyKey(activeOption?.target ?? null)}
            className="h-full"
          />
        </div>
      ) : (
        <div className="bg-bg-main flex h-full flex-1 overflow-hidden">
          <CodeSidebar
            fileTree={fileTree}
            activeFile={activeFile}
            openFolders={openFolders}
            onOpenFile={openFile}
            onToggleFolder={toggleFolder}
            sidebarMode={sidebarMode}
            onSidebarModeChange={setSidebarMode}
            enableSearch={true}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            searchResults={globalSearchResults}
            onResultClick={jumpToLine}
          />

          {/* Main Content */}
          <div className="bg-bg-main flex h-full min-w-0 flex-1 flex-col">
            <CodeEditorTabs
              openedFiles={openedFiles}
              activeFile={activeFile}
              updatedFiles={updatedFiles.map(f => f.path)}
              theme={theme}
              onSelectFile={setActiveFile}
              onCloseFile={closeFile}
            />

            {/* Action Bar */}
            <CodeActionBar
              activeFile={activeFile}
              onFormat={handleSave}
            />

            {/* Editor */}
            <div className="relative w-full flex-1">
              {activeFile ? (
                <Editor
                  height="100%"
                  path={`file:///${activeFile.startsWith("src/") ? activeFile : `src/${activeFile}`}`}
                  language={activeFileObj?.language || "javascript"}
                  value={activeFileObj?.content || ""}
                  theme={currentTheme}
                  beforeMount={handleEditorWillMount}
                  onMount={handleEditorDidMount}
                  onChange={handleEditorChange}
                  options={{
                    tabSize: 2,
                    fontFamily: "JetBrains Mono, Fira Code, monospace",
                    fontSize: 14,
                    fontLigatures: true,
                    lineNumbers: "on",
                    glyphMargin: true,
                    folding: true,
                    minimap: { enabled: true },
                    scrollBeyondLastLine: false,
                    formatOnType: true,
                    formatOnPaste: true,
                    autoIndent: "full",
                    colorDecorators: true,
                    hover: { enabled: true },
                    suggest: {
                      showProperties: true,
                      showMethods: true,
                      showClasses: true,
                    },
                    quickSuggestions: {
                      other: true,
                      comments: false,
                      strings: true,
                    },
                    suggestOnTriggerCharacters: true,
                    acceptSuggestionOnEnter: "on",
                    multiCursorModifier: "alt",
                    selectionHighlight: true,
                    occurrencesHighlight: "singleFile",
                  }}
                />
              ) : (
                <CodeEmptyState />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
