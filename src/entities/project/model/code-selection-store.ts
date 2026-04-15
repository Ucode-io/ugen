import { create } from 'zustand'
import type { CodeEditorTarget } from '@/entities/session'

export interface CodeSelectionFile {
  path: string
  content: string
}

interface CodeSelectionState {
  activeCodeSelection: CodeEditorTarget | null
  /** Files associated with the active microfrontend selection (for preview) */
  activeCodeFiles: CodeSelectionFile[] | null
  setActiveCodeSelection: (target: CodeEditorTarget | null, files?: CodeSelectionFile[] | null) => void
  clearCodeSelection: () => void
}

export const useCodeSelectionStore = create<CodeSelectionState>((set) => ({
  activeCodeSelection: null,
  activeCodeFiles: null,
  setActiveCodeSelection: (target, files = null) =>
    set({ activeCodeSelection: target, activeCodeFiles: files }),
  clearCodeSelection: () => set({ activeCodeSelection: null, activeCodeFiles: null }),
}))
