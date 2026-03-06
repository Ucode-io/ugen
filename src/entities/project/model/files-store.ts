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
  setFiles: (files: IFile[]) => void
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
  setFiles: (files) => set({ files }),
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
