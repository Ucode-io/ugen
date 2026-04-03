"use client"
import { useEffect, useState, useMemo } from "react";
import Editor from "@monaco-editor/react";
import { getFileTree, getFileContent } from "../lib/gitlab";
import {
  CodeSidebar,
  CodeEditorTabs,
  CodeActionBar,
  CodeEmptyState,
  buildFileTree,
} from "./code-viewer-ui";
import { useUIStore } from "@/shared/model/theme/use-ui-store";

interface GitlabEditorProps {
  path: string;   // "my-fidani_warehouse"
  branch: string; // "master"
  name: string;   // "warehouse"
  type?: string;  // "MICRO_FRONTEND", "KNATIVE", etc.
}

interface FileNode {
  id: string;
  name: string;
  path: string;
  type: "blob" | "tree";
}

export function GitlabCodeEditor({ path, branch, name, type }: GitlabEditorProps) {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [openedFiles, setOpenedFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [fileContentsCache, setFileContentsCache] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { theme } = useUIStore();

  useEffect(() => {
    // Escape key to exit fullscreen
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    setFiles([]);
    setOpenedFiles([]);
    setSelectedFile(null);
    setContent("");
    setFileContentsCache({});
    setError(null);

    getFileTree(path, branch, type)
      .then(data => {
        setFiles(data);
      })
      .catch((e) => setError(e.message));
  }, [path, branch]);

  const fileTree = useMemo(() => {
    const blobs = files.filter((f) => f.type === "blob");
    return buildFileTree(blobs);
  }, [files]);

  const toggleFolder = (folderPath: string) => {
    const next = new Set(openFolders);
    if (next.has(folderPath)) next.delete(folderPath);
    else next.add(folderPath);
    setOpenFolders(next);
  };

  const handleSelectFile = async (filePath: string) => {
    if (!openedFiles.includes(filePath)) {
      setOpenedFiles((prev) => [...prev, filePath]);
    }
    setSelectedFile(filePath);

    if (fileContentsCache[filePath] !== undefined) {
      setContent(fileContentsCache[filePath]);
      return;
    }

    setLoading(true);
    try {
      const text = await getFileContent(path, filePath, branch, type);
      setContent(text);
      setFileContentsCache((prev) => ({ ...prev, [filePath]: text }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseFile = (e: React.MouseEvent, filePath: string) => {
    e.stopPropagation();
    const newOpened = openedFiles.filter((p) => p !== filePath);
    setOpenedFiles(newOpened);
    if (selectedFile === filePath) {
      const nextFile = newOpened.length > 0 ? newOpened[newOpened.length - 1] : null;
      if (nextFile) {
        handleSelectFile(nextFile);
      } else {
        setSelectedFile(null);
        setContent("");
      }
    }
  };

  const getLanguage = (filePath: string) => {
    if (filePath.endsWith(".tsx") || filePath.endsWith(".ts")) return "typescript";
    if (filePath.endsWith(".css") || filePath.endsWith(".scss")) return "css";
    if (filePath.endsWith(".json")) return "json";
    if (filePath.endsWith(".html")) return "html";
    return "javascript";
  };

  return (
    <div className={`bg-bg-main flex w-full flex-1 overflow-hidden text-[13px] border-border-subtle ${
      isFullscreen 
        ? "fixed inset-0 z-[9999] h-screen w-screen rounded-none" 
        : "h-[500px] rounded-b-2xl border-t max-w-[958px]"
    }`}>
      <CodeSidebar
        header={
          <div className="text-text-muted font-mono text-xs uppercase opacity-80">
            {name} / {branch}
            {error && <div className="text-red-500 mt-2">{error}</div>}
          </div>
        }
        fileTree={fileTree}
        activeFile={selectedFile}
        openFolders={openFolders}
        onOpenFile={handleSelectFile}
        onToggleFolder={toggleFolder}
        enableSearch={false}
        maxHeight={isFullscreen ? "100vh" : "500px"}
      />

      {/* Main Content */}
      <div className="bg-bg-main flex h-full min-w-0 flex-1 flex-col">
        <CodeEditorTabs
          openedFiles={openedFiles}
          activeFile={selectedFile}
          onSelectFile={handleSelectFile}
          onCloseFile={handleCloseFile}
        />

        <CodeActionBar
          activeFile={selectedFile}
          toggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          isFullscreen={isFullscreen}
          rightAction={
            loading && (
              <span className="text-text-muted animate-pulse text-xs">
                Loading...
              </span>
            )
          }
        />

        {/* Editor */}
        <div className="relative w-full flex-1 h-full min-h-0 bg-bg-card">
          {selectedFile ? (
            <Editor
              height="100%"
              language={getLanguage(selectedFile)}
              value={content}
              theme={theme === "dark" ? "vs-dark" : "vs-light"}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: "JetBrains Mono, Fira Code, monospace",
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

export { GitlabCodeEditor as MicrofrontendEditor };
