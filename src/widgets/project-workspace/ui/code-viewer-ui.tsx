import React from "react";
import {
  FileCode2,
  FileJson,
  FileType,
  Code2,
  Files,
  Search,
  Folder,
  ChevronRight,
  X,
  Paintbrush,
  Maximize2,
  Minimize2
} from "lucide-react";

export const getFileIcon = (fileName: string) => {
  if (fileName.endsWith(".js") || fileName.endsWith(".jsx"))
    return <FileJson size={14} className="shrink-0 text-yellow-500" />;
  if (fileName.endsWith(".ts") || fileName.endsWith(".tsx"))
    return <FileType size={14} className="shrink-0 text-blue-500" />;
  if (fileName.endsWith(".css") || fileName.endsWith(".scss"))
    return <Code2 size={14} className="shrink-0 text-sky-500" />;
  return <FileCode2 size={14} className="shrink-0 text-slate-500" />;
};

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: TreeNode[];
}

export const buildFileTree = (files: { path: string }[]): TreeNode[] => {
  const root: { children: TreeNode[] } = { children: [] };
  files.forEach((file) => {
    const parts = file.path.split("/");
    let currentChildren = root.children;
    parts.forEach((part, idx) => {
      const isFile = idx === parts.length - 1;
      const currentPath = parts.slice(0, idx + 1).join("/");
      let node = currentChildren.find((c) => c.name === part);
      if (!node) {
        node = {
          name: part,
          path: currentPath,
          type: isFile ? "file" : "folder",
          children: isFile ? undefined : [],
        };
        currentChildren.push(node);
      }
      if (node.children) currentChildren = node.children;
    });
  });

  const sortNodes = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.children && sortNodes(n.children));
  };
  sortNodes(root.children);
  return root.children;
};

export interface SearchResultItem {
  file: { path: string };
  lineNumber: number;
  matchLine: string;
  matchCol: number;
  queryLength: number;
}

interface CodeSidebarProps {
  header?: React.ReactNode;
  fileTree: TreeNode[];
  activeFile: string | null;
  openFolders: Set<string>;
  onOpenFile: (path: string) => void;
  onToggleFolder: (path: string) => void;

  sidebarMode?: "explorer" | "search";
  onSidebarModeChange?: (mode: "explorer" | "search") => void;
  enableSearch?: boolean;
  searchQuery?: string;
  onSearchQueryChange?: (val: string) => void;
  searchResults?: SearchResultItem[];
  onResultClick?: (path: string, line: number, col: number) => void;
  maxHeight?: string | number;
}

export const CodeSidebar = ({
  header,
  fileTree,
  activeFile,
  openFolders,
  onOpenFile,
  onToggleFolder,
  sidebarMode = "explorer",
  onSidebarModeChange,
  enableSearch = false,
  searchQuery = "",
  onSearchQueryChange,
  searchResults = [],
  onResultClick,
  maxHeight,
}: CodeSidebarProps) => {

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return (
      <div className="flex flex-col">
        {nodes.map((node) => {
          const isFolder = node.type === "folder";
          const isOpen = openFolders.has(node.path);
          const isActive = activeFile === node.path;

          return (
            <div key={node.path} className="select-none">
              <div
                onClick={() =>
                  isFolder ? onToggleFolder(node.path) : onOpenFile(node.path)
                }
                className={`hover:bg-hover-bg flex cursor-pointer items-center gap-1.5 px-2 py-1 transition-colors ${isActive ? "bg-primary/10 text-primary" : "text-text-main"
                  }`}
                style={{
                  paddingLeft: `${(isFolder ? level : level + 1) * 12 + 8}px`,
                }}
              >
                {isFolder ? (
                  <>
                    <ChevronRight
                      size={14}
                      className={`shrink-0 transition-transform ${isOpen ? "rotate-90" : ""
                        }`}
                    />
                    <Folder
                      size={14}
                      className="shrink-0 text-blue-400"
                      fill="currentColor"
                      fillOpacity={0.2}
                    />
                  </>
                ) : (
                  getFileIcon(node.name)
                )}
                <span className="flex-1 truncate font-medium">{node.name}</span>
              </div>
              {isFolder &&
                isOpen &&
                node.children &&
                renderTree(node.children, level + 1)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div 
      className="border-border-subtle bg-bg-card flex w-72 shrink-0 flex-col border-r h-full overflow-hidden"
      style={{ maxHeight }}
    >
      {header && (
        <div className="bg-bg-main border-border-subtle shrink-0 border-b p-3">
          {header}
        </div>
      )}
      {enableSearch && onSidebarModeChange && (
        <div className="bg-bg-main border-border-subtle flex shrink-0 border-b p-1">
          <button
            onClick={() => onSidebarModeChange("explorer")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm py-1.5 transition-colors ${sidebarMode === "explorer"
              ? "bg-primary/10 text-primary font-medium"
              : "text-text-muted hover:text-text-main"
              }`}
          >
            <Files size={14} /> Explorer
          </button>
          <button
            onClick={() => onSidebarModeChange("search")}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-sm py-1.5 transition-colors ${sidebarMode === "search"
              ? "bg-primary/10 text-primary font-medium"
              : "text-text-muted hover:text-text-main"
              }`}
          >
            <Search size={14} /> Search
          </button>
        </div>
      )}

      {sidebarMode === "explorer" || !enableSearch ? (
        <div className="flex-1 overflow-y-auto py-2">
          {renderTree(fileTree)}
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-border-subtle shrink-0 border-b p-3">
            <div className="relative">
              <Search
                size={14}
                className="text-text-muted absolute top-1/2 left-3 -translate-y-1/2"
              />
              <input
                type="text"
                autoFocus
                placeholder="Search in files..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange?.(e.target.value)}
                className="bg-bg-main border-border-subtle focus:border-primary text-text-main placeholder:text-text-muted w-full rounded-md border py-1.5 pr-3 pl-8 transition-colors outline-none"
              />
            </div>
            {searchQuery && (
              <div className="text-text-muted mt-2 text-xs">
                Found {searchResults.length}{" "}
                {searchResults.length === 1 ? "match" : "matches"}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {searchResults.map((result, idx) => (
              <div
                key={idx}
                onClick={() =>
                  onResultClick?.(
                    result.file.path,
                    result.lineNumber,
                    result.matchCol
                  )
                }
                className="hover:bg-hover-bg hover:border-border-subtle mb-1 cursor-pointer rounded-md border border-transparent p-2 transition-all"
              >
                <div className="mb-1 flex items-center gap-1.5 opacity-80">
                  {getFileIcon(result.file.path)}
                  <span className="text-text-main font-semibold">
                    {result.file.path.split("/").pop()}
                  </span>
                  <span className="text-text-muted ml-auto text-xs">
                    Line {result.lineNumber}
                  </span>
                </div>
                <div className="text-text-muted truncate pl-5 font-mono">
                  {result.matchLine.substring(
                    0,
                    Math.max(
                      0,
                      result.matchLine
                        .toLowerCase()
                        .indexOf(searchQuery.toLowerCase())
                    )
                  )}
                  <span className="rounded-sm bg-yellow-400/30 px-0.5 font-bold text-yellow-600 dark:text-yellow-400">
                    {result.matchLine.substring(
                      result.matchLine
                        .toLowerCase()
                        .indexOf(searchQuery.toLowerCase()),
                      result.matchLine
                        .toLowerCase()
                        .indexOf(searchQuery.toLowerCase()) +
                      searchQuery.length
                    )}
                  </span>
                  {result.matchLine.substring(
                    result.matchLine
                      .toLowerCase()
                      .indexOf(searchQuery.toLowerCase()) +
                    searchQuery.length
                  )}
                </div>
              </div>
            ))}
            {searchQuery && searchResults.length === 0 && (
              <div className="text-text-muted mt-4 text-center">
                No results found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface CodeEditorTabsProps {
  openedFiles: string[];
  activeFile: string | null;
  updatedFiles?: string[];
  theme?: string;
  onSelectFile: (path: string) => void;
  onCloseFile: (e: React.MouseEvent, path: string) => void;
}

export const CodeEditorTabs = ({
  openedFiles,
  activeFile,
  updatedFiles = [],
  theme = "dark",
  onSelectFile,
  onCloseFile,
}: CodeEditorTabsProps) => {
  if (openedFiles.length === 0) return null;

  return (
    <div className="bg-bg-card border-border-subtle custom-scrollbar flex shrink-0 overflow-x-auto border-b">
      {openedFiles.map((path) => (
        <div
          key={path}
          onClick={() => onSelectFile(path)}
          className={`group border-border-subtle flex max-w-[200px] min-w-[120px] cursor-pointer items-center gap-2 border-r px-4 py-2 transition-colors select-none ${activeFile === path
            ? "bg-bg-main text-primary border-t-primary border-t-2"
            : "text-text-muted hover:bg-hover-bg border-t-2 border-t-transparent"
            }`}
        >
          {getFileIcon(path)}
          <span className="flex-1 truncate font-medium">
            {path.split("/").pop()}
          </span>
          {updatedFiles.includes(path) && (
            <span
              className={`h-2 w-2 rounded-full ${theme === "dark" ? "bg-white" : "bg-text-muted"
                }`}
            ></span>
          )}
          <button
            onClick={(e) => onCloseFile(e, path)}
            className={`rounded-sm p-0.5 hover:bg-black/10 dark:hover:bg-white/10 ${activeFile === path
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
              }`}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

interface CodeActionBarProps {
  activeFile: string | null;
  onFormat?: () => void;
  toggleFullscreen?: () => void;
  isFullscreen?: boolean;
  rightAction?: React.ReactNode;
}

export const CodeActionBar = ({
  activeFile,
  onFormat,
  toggleFullscreen,
  isFullscreen,
  rightAction,
}: CodeActionBarProps) => {
  if (!activeFile) return null;

  return (
    <div className="bg-bg-main border-border-subtle flex shrink-0 items-center justify-between border-b px-4 py-1.5">
      <div className="flex items-center gap-3">
        <span className="text-text-muted font-mono text-xs opacity-70">
          {activeFile}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {onFormat && (
          <button
            onClick={onFormat}
            className="text-text-muted hover:text-text-main hover:bg-hover-bg flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors"
          >
            <Paintbrush size={14} />
            <span>Format</span>
          </button>
        )}
        {toggleFullscreen && (
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className="text-text-muted hover:text-text-main hover:bg-hover-bg flex items-center gap-1.5 rounded-md px-2 py-1 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
        {rightAction}
      </div>
    </div>
  );
};

export const CodeEmptyState = () => (
  <div className="text-text-muted flex h-full flex-col items-center justify-center gap-4 opacity-50">
    <Code2 size={48} strokeWidth={1} />
    <p>Select a file to start editing</p>
  </div>
);
