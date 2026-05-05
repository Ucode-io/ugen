import { create } from 'zustand'
import type { CodeEditorTarget } from '@/entities/session'
import { getDirtyKey, useDirtyFilesStore } from './dirty-files-store'

export interface CodeSelectionFile {
  path: string
  content: string
  url?: string
}

interface CodeSelectionState {
  activeCodeSelection: CodeEditorTarget | null
  /** Files associated with the active microfrontend selection (for preview) */
  activeCodeFiles: CodeSelectionFile[] | null
  setActiveCodeSelection: (target: CodeEditorTarget | null, files?: CodeSelectionFile[] | null) => void
  /**
   * Replace specific files inside activeCodeFiles in place. Adds entries for
   * unknown paths. Bypasses dirty-merge logic — used right after a successful
   * save so the saved snapshot becomes the new base.
   */
  patchCodeFiles: (files: CodeSelectionFile[]) => void
  clearCodeSelection: () => void
}

export const useCodeSelectionStore = create<CodeSelectionState>((set, get) => ({
  activeCodeSelection: null,
  activeCodeFiles: null,
  setActiveCodeSelection: (target, files = null) => {
    // Preserve dirty content when API responses bring in fresh files for the
    // currently selected microfrontend. The user may still be editing those files.
    if (files && target) {
      const sameTarget =
        get().activeCodeSelection?.kind === target.kind &&
        get().activeCodeSelection?.id === target.id
      if (sameTarget) {
        const key = getDirtyKey(target)
        const dirtyMap = key ? useDirtyFilesStore.getState().dirty[key] : undefined
        if (dirtyMap && Object.keys(dirtyMap).length > 0) {
          files = files.map((f) =>
            dirtyMap[f.path] != null ? { ...f, content: dirtyMap[f.path] } : f,
          )
        }
      }
    }
    set({ activeCodeSelection: target, activeCodeFiles: files })
  },
  patchCodeFiles: (patch) => {
    const cur = get().activeCodeFiles
    if (!cur) return
    const patchMap = new Map(patch.map((f) => [f.path, f]))
    const next = cur.map((f) => {
      const p = patchMap.get(f.path)
      if (!p) return f
      patchMap.delete(f.path)
      return { ...f, content: p.content }
    })
    // New paths that weren't part of the existing codebase
    patchMap.forEach((f) => next.push({ ...f }))
    set({ activeCodeFiles: next })
  },
  clearCodeSelection: () => set({ activeCodeSelection: null, activeCodeFiles: null }),
}))
