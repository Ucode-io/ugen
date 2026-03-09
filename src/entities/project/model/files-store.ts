import { create } from 'zustand'

export interface IFile {
  path: string
  content: string
  language: string
}

interface FilesState {
  files: IFile[]
  activeFile: string
  openedFiles: string[]
  expandedFolders: string[]
  updatedFiles: IFile[]
  setFiles: (files: IFile[]) => void
  setUpdatedFiles: (files: IFile[]) => void
  updateFile: (path: string, content: string) => void
  setActiveFile: (path: string) => void
  setOpenedFiles: (paths: string[]) => void
  setExpandedFolders: (folders: string[]) => void
  clearWorkspace: () => void
}

export const useFilesStore = create<FilesState>((set) => ({
  files: [],
  activeFile: '',
  openedFiles: [],
  expandedFolders: ['app', 'app/[locale]', 'styles', 'utils'],
  updatedFiles: [],
  setFiles: (files) => set((state) => ({
    files,
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
    activeFile: '',
    openedFiles: [],
    expandedFolders: ['app', 'app/[locale]', 'styles', 'utils']
  })
}))
