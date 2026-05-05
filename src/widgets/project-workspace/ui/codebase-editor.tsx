"use client";
import { useEffect, useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import { Loader2 } from "lucide-react";
import {
  CodeSidebar,
  CodeEditorTabs,
  CodeActionBar,
  CodeEmptyState,
  buildFileTree,
} from "./code-viewer-ui";
import { useUIStore } from "@/shared/model/theme/use-ui-store";
import { useDirtyFilesStore } from "@/entities/project/model/dirty-files-store";

export interface CodebaseFile {
  path: string;
  content: string;
}

interface CodebaseEditorProps {
  files: CodebaseFile[];
  isLoading?: boolean;
  name?: string;
  branch?: string;
  className?: string;
  /** When set, edits are tracked in the dirty store under this key. When null/undefined, editor is read-only. */
  dirtyKey?: string | null;
}

function getLanguage(filePath: string) {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts":
    case "tsx":
      return "typescript";
    case "js":
    case "jsx":
      return "javascript";
    case "css":
      return "css";
    case "scss":
      return "scss";
    case "json":
      return "json";
    case "html":
      return "html";
    case "go":
      return "go";
    case "py":
      return "python";
    case "md":
      return "markdown";
    case "yaml":
    case "yml":
      return "yaml";
    default:
      return "plaintext";
  }
}

export function CodebaseEditor({
  files,
  isLoading,
  name,
  branch,
  className,
  dirtyKey,
}: CodebaseEditorProps) {
  const [openedFiles, setOpenedFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const { theme } = useUIStore();

  const dirtyMap = useDirtyFilesStore((s) => (dirtyKey ? s.dirty[dirtyKey] : undefined));
  const setDirtyFile = useDirtyFilesStore((s) => s.setDirtyFile);
  const removeDirtyFile = useDirtyFilesStore((s) => s.removeDirtyFile);

  const isReadOnly = !dirtyKey;

  // Merge base files with dirty overlay so the tree, tabs, and editor show the latest content.
  const mergedFiles = useMemo<CodebaseFile[]>(() => {
    if (!dirtyMap || Object.keys(dirtyMap).length === 0) return files;
    return files.map((f) =>
      dirtyMap[f.path] != null ? { ...f, content: dirtyMap[f.path] } : f,
    );
  }, [files, dirtyMap]);

  // Open the first file when files load
  useEffect(() => {
    if (files.length > 0) {
      const first = files[0].path;
      setSelectedFile(first);
      setOpenedFiles([first]);
    }
  }, [files]);

  const fileTree = useMemo(() => buildFileTree(mergedFiles), [mergedFiles]);

  const activeContent = useMemo(
    () => mergedFiles.find((f) => f.path === selectedFile)?.content ?? "",
    [mergedFiles, selectedFile],
  );

  const handleSelectFile = (filePath: string) => {
    if (!openedFiles.includes(filePath)) {
      setOpenedFiles((prev) => [...prev, filePath]);
    }
    setSelectedFile(filePath);
  };

  const handleCloseFile = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    const newOpened = openedFiles.filter((p) => p !== filePath);
    setOpenedFiles(newOpened);
    if (selectedFile === filePath) {
      const next = newOpened.length > 0 ? newOpened[newOpened.length - 1] : null;
      setSelectedFile(next);
    }
  };

  const toggleFolder = (path: string) => {
    const next = new Set(openFolders);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setOpenFolders(next);
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined || !selectedFile || !dirtyKey) return;
    const baseFile = files.find((f) => f.path === selectedFile);
    if (!baseFile) return;
    if (value === baseFile.content) {
      removeDirtyFile(dirtyKey, selectedFile);
    } else {
      setDirtyFile(dirtyKey, selectedFile, value);
    }
  };

  const dirtyPaths = useMemo(() => Object.keys(dirtyMap ?? {}), [dirtyMap]);

  if (isLoading) {
    return (
      <div
        className={`bg-bg-main flex w-full flex-1 items-center justify-center ${className ?? ""}`}
      >
        <div className="flex flex-col items-center gap-3 text-text-muted">
          <Loader2 className="animate-spin" size={24} />
          <span className="text-xs">Loading codebase...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-bg-main flex w-full flex-1 overflow-hidden text-[13px] ${className ?? ""}`}
    >
      <CodeSidebar
        header={
          name ? (
            <div className="flex items-center gap-2">
              <div className="text-text-muted font-mono text-xs uppercase opacity-80 truncate">
                {name}
                {branch ? ` / ${branch}` : ""}
              </div>
            </div>
          ) : undefined
        }
        fileTree={fileTree}
        activeFile={selectedFile}
        openFolders={openFolders}
        onOpenFile={handleSelectFile}
        onToggleFolder={toggleFolder}
        enableSearch={false}
      />

      <div className="bg-bg-main flex h-full min-w-0 flex-1 flex-col">
        <CodeEditorTabs
          openedFiles={openedFiles}
          activeFile={selectedFile}
          updatedFiles={dirtyPaths}
          onSelectFile={handleSelectFile}
          onCloseFile={handleCloseFile}
        />
        <CodeActionBar
          activeFile={selectedFile}
        />
        <div className="relative w-full flex-1 h-full min-h-0">
          {selectedFile ? (
            <Editor
              height="100%"
              language={getLanguage(selectedFile)}
              value={activeContent}
              theme={theme === "dark" ? "vs-dark" : "vs"}
              onChange={handleEditorChange}
              options={{
                readOnly: isReadOnly,
                minimap: { enabled: true },
                fontSize: 14,
                fontFamily: "JetBrains Mono, Fira Code, monospace",
                fontLigatures: true,
                scrollBeyondLastLine: false,
                lineNumbers: "on",
              }}
            />
          ) : (
            <CodeEmptyState />
          )}
        </div>
      </div>
    </div>
  );
}
