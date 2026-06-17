import { create } from 'zustand'

export interface IFile {
  path: string
  content: string
  language: string
}

interface FilesState {
  files: IFile[]
  // Project the files in this store belong to. Stamped whenever files are
  // loaded for a project so consumers can tell whether the global store still
  // holds the *previous* project's files during a navigation gap (the store is
  // shared and is cleared in an effect cleanup that runs after the next
  // project's viewer has already mounted). null = unknown / not yet stamped.
  filesProjectId: string | null
  activeFile: string
  openedFiles: string[]
  expandedFolders: string[]
  updatedFiles: IFile[]
  setFiles: (files: IFile[], projectId?: string) => void
  setUpdatedFiles: (files: IFile[]) => void
  updateFile: (path: string, content: string) => void
  setActiveFile: (path: string) => void
  setOpenedFiles: (paths: string[]) => void
  setExpandedFolders: (folders: string[]) => void
  clearWorkspace: () => void
}

export const useFilesStore = create<FilesState>((set) => ({
  files: [],
  filesProjectId: null,
  activeFile: '',
  openedFiles: [],
  expandedFolders: ['app', 'app/[locale]', 'styles', 'utils'],
  updatedFiles: [],
  setFiles: (files, projectId) => set((state) => ({
    files,
    // Keep the existing stamp when the caller doesn't pass one (e.g. legacy
    // writes); never silently overwrite a known project with `undefined`.
    filesProjectId: projectId !== undefined ? projectId : state.filesProjectId,
    // Initialize activeFile if it's empty and we have files
    activeFile: state.activeFile || (files.length > 0 ? (
      files.find(f =>
        f.path.includes('App.jsx') ||
        f.path.includes('index.jsx') ||
        f.path.includes('main.jsx') ||
        f.path.includes('App.tsx')
      )?.path || files[0].path
    ) : '')
  })),
  setUpdatedFiles: (updatedFiles) => set({ updatedFiles }),
  updateFile: (path, content) =>
    set((state) => ({
      files: state.files.map((f) => (f.path === path ? { ...f, content } : f))
    })),
  setActiveFile: (activeFile) => set({ activeFile }),
  setOpenedFiles: (openedFiles) => set({ openedFiles }),
  setExpandedFolders: (expandedFolders) => set({ expandedFolders }),
  clearWorkspace: () => set({
    files: [],
    filesProjectId: null,
    activeFile: '',
    openedFiles: [],
    // Must be reset too — otherwise unsaved-edit buffers (full file contents)
    // survive project switches and accumulate across the whole session.
    updatedFiles: [],
    expandedFolders: ['app', 'app/[locale]', 'styles', 'utils']
  })
}))
