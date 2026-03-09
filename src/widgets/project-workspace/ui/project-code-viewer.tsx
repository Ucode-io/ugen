'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Editor from '@monaco-editor/react'
import { FileCode2, FileJson, FileType, Search, X, Code2, Paintbrush, ChevronRight, Folder, Files } from 'lucide-react'
import prettier from 'prettier/standalone'
import babelPlugin from 'prettier/plugins/babel'
import estreePlugin from 'prettier/plugins/estree'
import { useFilesStore, IFile } from '@/entities/project/model/files-store'
import { useUIStore } from '@/shared/model/theme/use-ui-store'
import { api } from '@/shared/api'

interface FileNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: FileNode[]
}

interface SearchResult {
  file: IFile
  lineNumber: number
  matchLine: string
  matchCol: number
  queryLength: number
}

export const ProjectCodeViewer = ({ projectId, getLanguageByPath }: { projectId: string, getLanguageByPath: (path: string) => string }) => {
  const files = useFilesStore((state) => state.files)
  const activeFile = useFilesStore((state) => state.activeFile)
  const openedFiles = useFilesStore((state) => state.openedFiles)
  const expandedFolders = useFilesStore((state) => state.expandedFolders)
  const updatedFiles = useFilesStore((state) => state.updatedFiles)
  const setActiveFile = useFilesStore((state) => state.setActiveFile)
  const setOpenedFiles = useFilesStore((state) => state.setOpenedFiles)
  const setExpandedFolders = useFilesStore((state) => state.setExpandedFolders)
  const setUpdatedFiles = useFilesStore((state) => state.setUpdatedFiles)
  const updateFile = useFilesStore((state) => state.updateFile)

  const [sidebarMode, setSidebarMode] = useState<'explorer' | 'search'>('explorer')
  const [searchQuery, setSearchQuery] = useState('')
  const openFolders = useMemo(() => new Set(expandedFolders), [expandedFolders])

  const { theme } = useUIStore()
  const [mounted, setMounted] = useState(false)
  const editorRef = useRef<any>(null)
  const monacoRef = useRef<any>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = mounted && theme === 'dark' ? 'vs-dark' : 'vs'

  const handleEditorWillMount = (monaco: any) => {
    monaco.editor.defineTheme('vscode-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1e1e1e',
        'editor.lineHighlightBackground': '#2a2d2e',
        'editorCursor.foreground': '#aeafad',
        'editor.selectionBackground': '#264f78',
        'editor.inactiveSelectionBackground': '#3a3d41',
      },
    })
    monaco.editor.setTheme(currentTheme)
  }

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor
    monacoRef.current = monaco

    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    })

    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })

    files.forEach((file) => {
      if (!monaco.editor.getModel(monaco.Uri.parse(`file:///${file.path}`))) {
        monaco.editor.createModel(file.content, file.language, monaco.Uri.parse(`file:///${file.path}`))
      }
    })

    editor.addAction({
      id: 'format-with-prettier',
      label: 'Format Document',
      keybindings: [monaco.KeyMod.Shift | monaco.KeyMod.Alt | monaco.KeyCode.KeyF],
      run: async () => {
        const val = editor.getValue()
        try {
          const formatted = await prettier.format(val, {
            parser: 'babel',
            plugins: [babelPlugin, estreePlugin],
            singleQuote: true,
          })
          editor.executeEdits('prettier', [{
            range: editor.getModel().getFullModelRange(),
            text: formatted,
            forceMoveMarkers: true
          }])
        } catch (err) {
          console.error('Format failed', err)
        }
      },
    })

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave()
    })
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, () => {
      setSidebarMode('search')
      setSearchQuery('')
    })
  }

  // Handle initial opened files if activeFile is set but not in openedFiles
  useEffect(() => {
    if (activeFile && !openedFiles.includes(activeFile)) {
      setOpenedFiles([...openedFiles, activeFile]);
    }
  }, [activeFile, openedFiles, setOpenedFiles]);

  useEffect(() => {
    if (!monacoRef.current) return
    const monaco = monacoRef.current
    files.forEach((file) => {
      const uri = monaco.Uri.parse(`file:///${file.path}`)
      const model = monaco.editor.getModel(uri)
      if (!model) {
        monaco.editor.createModel(file.content, file.language, uri)
      } else if (model.getValue() !== file.content && file.path !== activeFile) {
        model.setValue(file.content)
      }
    })
  }, [files, activeFile])

  // Use refs to avoid stale closures in event listeners and Monaco commands
  const activeFileRef = useRef(activeFile)
  const updatedFilesRef = useRef(updatedFiles)
  const projectIdRef = useRef(projectId)

  useEffect(() => {
    activeFileRef.current = activeFile
    updatedFilesRef.current = updatedFiles
    projectIdRef.current = projectId
  }, [activeFile, updatedFiles, projectId])

  const handleSave = () => {
    const currentActiveFile = activeFileRef.current

    if (editorRef.current) {
      const val = editorRef.current.getValue()
      updateFile(currentActiveFile, val)
      setUpdatedFiles(updatedFilesRef.current.filter((f) => f.path !== currentActiveFile))

      api.put(`/v1/mcp_project/${projectIdRef.current}`, {
        project_id: projectIdRef.current,
        project_files: [{ path: currentActiveFile, content: val, language: getLanguageByPath(currentActiveFile) }]
      })
    }
  }

  const handleEditorChange = (value: string | undefined) => {
    if (value !== undefined) {
      const currentActiveFile = activeFileRef.current
      setUpdatedFiles([...updatedFilesRef.current, {
        path: currentActiveFile,
        content: value,
        language: getLanguageByPath(currentActiveFile)
      }])
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleSave()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const openFile = (path: string) => {
    if (!openedFiles.includes(path)) setOpenedFiles([...openedFiles, path])
    console.log({ path })
    setActiveFile(path)
  }

  const closeFile = (e: React.MouseEvent, path: string) => {
    e.stopPropagation()
    const newOpened = openedFiles.filter((p) => p !== path)
    setOpenedFiles(newOpened)
    if (activeFile === path) setActiveFile(newOpened.length > 0 ? newOpened[newOpened.length - 1] : '')
  }

  const jumpToLine = (path: string, lineNumber: number, column: number) => {
    openFile(path)
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(lineNumber)
        editorRef.current.setPosition({ lineNumber, column })
        editorRef.current.focus()
      }
    }, 100)
  }

  const toggleFolder = (path: string) => {
    const next = new Set(openFolders)
    if (next.has(path)) next.delete(path)
    else next.add(path)
    setExpandedFolders(Array.from(next))
  }

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return <FileJson size={14} className="text-yellow-500 shrink-0" />
    if (fileName.endsWith('.ts') || fileName.endsWith('.tsx')) return <FileType size={14} className="text-blue-500 shrink-0" />
    if (fileName.endsWith('.css')) return <Code2 size={14} className="text-sky-500 shrink-0" />
    return <FileCode2 size={14} className="text-slate-500 shrink-0" />
  }

  // Build Folder Tree
  const fileTree = useMemo(() => {
    const root: { children: FileNode[] } = { children: [] }
    files.forEach((file) => {
      const parts = file.path.split('/')
      let currentChildren = root.children
      parts.forEach((part, idx) => {
        const isFile = idx === parts.length - 1
        const currentPath = parts.slice(0, idx + 1).join('/')
        let node = currentChildren.find((c) => c.name === part)
        if (!node) {
          node = { name: part, path: currentPath, type: isFile ? 'file' : 'folder', children: isFile ? undefined : [] }
          currentChildren.push(node)
        }
        if (node.children) currentChildren = node.children
      })
    })

    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
      nodes.forEach((n) => n.children && sortNodes(n.children))
    }
    sortNodes(root.children)
    return root.children
  }, [files])

  // Perform Search
  const globalSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return []
    const results: SearchResult[] = []
    const q = searchQuery.toLowerCase()

    files.forEach((file) => {
      const lines = file.content.split('\n')
      lines.forEach((line, index) => {
        const matchCol = line.toLowerCase().indexOf(q)
        if (matchCol !== -1) {
          results.push({
            file,
            lineNumber: index + 1,
            matchLine: line.trim(),
            matchCol: matchCol + 1,
            queryLength: searchQuery.length,
          })
        }
      })
    })
    return results
  }, [files, searchQuery])

  const renderTree = (nodes: FileNode[], level = 0) => {
    return (
      <div className="flex flex-col">
        {nodes.map((node) => {
          const isFolder = node.type === 'folder'
          const isOpen = openFolders.has(node.path)
          const isActive = activeFile === node.path

          return (
            <div key={node.path} className='select-none'>
              <div
                onClick={() => (isFolder ? toggleFolder(node.path) : openFile(node.path))}
                className={`flex items-center gap-1.5 py-1 px-2 cursor-pointer transition-colors hover:bg-hover-bg ${isActive ? 'bg-primary/10 text-primary' : 'text-text-main'}`}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
              >
                {isFolder ? (
                  <>
                    <ChevronRight size={14} className={`shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                    <Folder size={14} className="text-blue-400 shrink-0" fill="currentColor" fillOpacity={0.2} />
                  </>
                ) : (
                  getFileIcon(node.name)
                )}
                <span className="truncate flex-1 font-medium">{node.name}</span>
              </div>
              {isFolder && isOpen && node.children && renderTree(node.children, level + 1)}
            </div>
          )
        })}
      </div>
    )
  }

  const activeFileObj = files.find((f) => f.path === activeFile)

  return (
    <div className="flex flex-1 h-full w-full bg-bg-main overflow-hidden text-[13px]">
      {/* Sidebar */}
      <div className="w-72 border-r border-border-subtle bg-bg-card flex flex-col shrink-0">
        <div className="flex bg-bg-main border-b border-border-subtle p-1 shrink-0">
          <button
            onClick={() => setSidebarMode('explorer')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-sm transition-colors ${sidebarMode === 'explorer' ? 'bg-primary/10 text-primary font-medium' : 'text-text-muted hover:text-text-main'}`}
          >
            <Files size={14} /> Explorer
          </button>
          <button
            onClick={() => setSidebarMode('search')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-sm transition-colors ${sidebarMode === 'search' ? 'bg-primary/10 text-primary font-medium' : 'text-text-muted hover:text-text-main'}`}
          >
            <Search size={14} /> Search
          </button>
        </div>

        {sidebarMode === 'explorer' ? (
          <div className="flex-1 overflow-y-auto py-2">
            {renderTree(fileTree)}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-border-subtle shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search in files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-main border border-border-subtle rounded-md pl-8 pr-3 py-1.5 outline-none focus:border-primary transition-colors text-text-main placeholder:text-text-muted"
                />
              </div>
              {searchQuery && (
                <div className="text-xs text-text-muted mt-2">
                  Found {globalSearchResults.length} {globalSearchResults.length === 1 ? 'match' : 'matches'}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {globalSearchResults.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => jumpToLine(result.file.path, result.lineNumber, result.matchCol)}
                  className="p-2 mb-1 rounded-md cursor-pointer hover:bg-hover-bg border border-transparent hover:border-border-subtle transition-all"
                >
                  <div className="flex items-center gap-1.5 mb-1 opacity-80">
                    {getFileIcon(result.file.path)}
                    <span className="font-semibold text-text-main">{result.file.path.split('/').pop()}</span>
                    <span className="text-text-muted text-xs ml-auto">Line {result.lineNumber}</span>
                  </div>
                  <div className="font-mono text-text-muted truncate pl-5">
                    {result.matchLine.substring(0, Math.max(0, result.matchLine.toLowerCase().indexOf(searchQuery.toLowerCase())))}
                    <span className="bg-yellow-400/30 text-yellow-600 dark:text-yellow-400 rounded-sm px-0.5 font-bold">
                      {result.matchLine.substring(
                        result.matchLine.toLowerCase().indexOf(searchQuery.toLowerCase()),
                        result.matchLine.toLowerCase().indexOf(searchQuery.toLowerCase()) + searchQuery.length
                      )}
                    </span>
                    {result.matchLine.substring(result.matchLine.toLowerCase().indexOf(searchQuery.toLowerCase()) + searchQuery.length)}
                  </div>
                </div>
              ))}
              {searchQuery && globalSearchResults.length === 0 && (
                <div className="text-center text-text-muted mt-4">No results found.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 bg-bg-main h-full">
        {openedFiles.length > 0 && (
          <div className="flex overflow-x-auto bg-bg-card border-b border-border-subtle shrink-0 custom-scrollbar">
            {openedFiles.map((path) => (
              <div
                key={path}
                onClick={() => setActiveFile(path)}
                className={`flex items-center gap-2 px-4 py-2 min-w-[120px] max-w-[200px] cursor-pointer group border-r border-border-subtle transition-colors select-none ${activeFile === path ? 'bg-bg-main text-primary border-t-2 border-t-primary' : 'text-text-muted hover:bg-hover-bg border-t-2 border-t-transparent'}`}
              >
                {getFileIcon(path)}
                <span className="truncate flex-1 font-medium">{path.split('/').pop()}</span>
                {updatedFiles.some((f) => f.path === path) && (
                  <span className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-white' : 'bg-text-muted'}`}></span>
                )}
                <button
                  onClick={(e) => closeFile(e, path)}
                  className={`p-0.5 rounded-sm hover:bg-black/10 dark:hover:bg-white/10 ${activeFile === path ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action Bar */}
        {activeFile && (
          <div className="flex items-center justify-end px-4 py-1.5 bg-bg-main border-b border-border-subtle shrink-0">
            <span className="text-text-muted mr-auto font-mono text-xs opacity-70">{activeFile}</span>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 text-text-muted hover:text-text-main px-2 py-1 rounded-md transition-colors hover:bg-hover-bg"
            >
              <Paintbrush size={14} />
              <span>Format</span>
            </button>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1 w-full relative">
          {activeFile ? (
            <Editor
              height="100%"
              path={`file:///${activeFile}`}
              language={activeFileObj?.language || 'javascript'}
              value={activeFileObj?.content || ''}
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
            <div className="flex flex-col items-center justify-center h-full text-text-muted gap-4 opacity-50">
              <Code2 size={48} strokeWidth={1} />
              <p>Select a file to start editing</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
