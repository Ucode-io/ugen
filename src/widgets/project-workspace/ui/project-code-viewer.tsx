"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import typescript from "typescript";
import { setupTypeAcquisition } from "@typescript/ata";
import Editor from "@monaco-editor/react";
import {
  CodeSidebar,
  CodeEditorTabs,
  CodeActionBar,
  CodeEmptyState,
  buildFileTree,
} from "./code-viewer-ui";
import prettier from "prettier/standalone";
import babelPlugin from "prettier/plugins/babel";
import estreePlugin from "prettier/plugins/estree";
import { useFilesStore, IFile } from "@/entities/project/model/files-store";
import { useUIStore } from "@/shared/model/theme/use-ui-store";
import { api } from "@/shared/api";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/entities/session";
import type { CodeEditorTarget } from "@/entities/session";
import { GitlabCodeEditor } from "./gitlab-code-view";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { Layers2, Zap, Sparkles } from "lucide-react";



// ── Types ──────────────────────────────────────────────────────────────────
type DropdownOption = {
  value: string;          // unique key used in the Select
  label: string;
  group: 'frontend' | 'microfrontend' | 'function';
  target: CodeEditorTarget;
};

const FRONTEND_VALUE = '__generated_frontend__';

// ── Component ───────────────────────────────────────────────────────────────
export const ProjectCodeViewer = ({
  projectId,
  getLanguageByPath,
}: {
  projectId: string;
  getLanguageByPath: (path: string) => string;
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

  // ── API Queries for dropdown options ──────────────────────────────────────
  const { data: microfrontendsData = [] } = useQuery({
    queryKey: ['microfrontends-dropdown', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v2/functions/micro-frontend', {
        params: { offset: 0, limit: 50, 'project-id': projectId },
      });
      return (data.data?.functions ?? []) as Array<{
        id: string; name: string; path: string; branch?: string;
        type: string; project_id?: string;
      }>;
    },
    enabled: !!projectId,
  });

  const { data: functionsData = [] } = useQuery({
    queryKey: ['functions-dropdown', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v1/function', {
        params: { limit: 50, offset: 0, 'project-id': projectId },
      });
      return (data.data?.functions ?? []) as Array<{
        id: string; name: string; path?: string; branch?: string;
        type: string; repo_id?: string;
      }>;
    },
    enabled: !!projectId,
  });

  // Build the full option list
  const dropdownOptions = useMemo<DropdownOption[]>(() => [
    {
      value: FRONTEND_VALUE,
      label: 'Generated Frontend',
      group: 'frontend',
      target: { kind: 'frontend' },
    },
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
        repoId: mf.project_id,
      },
    })),
    ...functionsData.map((fn) => ({
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

  // Auto-select when codeEditorTarget arrives from the store.
  // We also re-run whenever dropdownOptions changes (API data loads) so we can
  // match even if the queries finish after the tab switch.
  useEffect(() => {
    if (!codeEditorTarget) return;
    // Wait until at least one non-frontend option has loaded before giving up
    const hasLoadedOptions = dropdownOptions.length > 1;
    const match = dropdownOptions.find(
      (o) => o.target.kind === codeEditorTarget.kind && o.target.id === codeEditorTarget.id
    );
    if (match) {
      setSelectedValue(match.value);
      setCodeEditorTarget(null); // consumed
    } else if (hasLoadedOptions) {
      // Options loaded but item not found — still clear to avoid stale state
      setCodeEditorTarget(null);
    }
    // If options not yet loaded, keep codeEditorTarget in store and retry on next render
  }, [codeEditorTarget, dropdownOptions, setCodeEditorTarget]);

  // The currently active dropdown selection
  const activeOption = useMemo(
    () => dropdownOptions.find((o) => o.value === selectedValue) ?? dropdownOptions[0],
    [dropdownOptions, selectedValue]
  );

  const isGitlabMode = activeOption?.target?.kind !== 'frontend';

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

    const ata = setupTypeAcquisition({
      projectName: "ugen-workspace",
      typescript: typescript,
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

    const triggerAta = (content: string) => {
      ata(content);
    };

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

  // ── Dropdown UI helper ─────────────────────────────────────────────────────
  const EditorDropdown = (
    <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle bg-bg-card shrink-0 z-10">
      <Select value={selectedValue} onValueChange={setSelectedValue}>
        <SelectTrigger className="h-7 w-[260px] text-xs border-border-subtle bg-bg-sidebar rounded-lg gap-1.5 px-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="text-xs">
          <SelectItem value={FRONTEND_VALUE}>
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-primary" />
              Generated Frontend
            </span>
          </SelectItem>
          {microfrontendsData.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-[10px] uppercase tracking-wider text-text-muted px-2 pt-2">
                <span className="flex items-center gap-1">
                  <Layers2 size={10} /> Microfrontends
                </span>
              </SelectLabel>
              {dropdownOptions
                .filter((o) => o.group === 'microfrontend')
                .map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
            </SelectGroup>
          )}
          {functionsData.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-[10px] uppercase tracking-wider text-text-muted px-2 pt-2">
                <span className="flex items-center gap-1">
                  <Zap size={10} /> Functions
                </span>
              </SelectLabel>
              {dropdownOptions
                .filter((o) => o.group === 'function')
                .map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
            </SelectGroup>
          )}
        </SelectContent>
      </Select>
      <span className="text-[11px] text-text-muted">
        {isGitlabMode ? 'GitLab Repository' : 'AI Generated'}
      </span>
    </div>
  );

  return (
    <div className="bg-bg-main flex h-full w-full flex-1 overflow-hidden flex-col text-[13px]">
      {EditorDropdown}

      {isGitlabMode ? (
        <div className="flex-1 overflow-hidden">
          <GitlabCodeEditor
            key={selectedValue}
            path={activeOption?.target?.path ?? ''}
            branch={activeOption?.target?.branch ?? 'master'}
            name={activeOption?.target?.name ?? ''}
            type={activeOption?.target?.type}
            repoId={activeOption?.target?.repoId}
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
  );
};
