import { create } from 'zustand'
import type { CodeEditorTarget } from '@/entities/session'

export type DirtyKey = string

export const getDirtyKey = (selection: CodeEditorTarget | null | undefined): DirtyKey | null => {
  if (selection?.kind === 'microfrontend' && selection.id) return `mf:${selection.id}`
  return null
}

interface DirtyFilesState {
  dirty: Record<DirtyKey, Record<string, string>>
  setDirtyFile: (key: DirtyKey, path: string, content: string) => void
  setDirtyFiles: (key: DirtyKey, patch: Record<string, string>) => void
  removeDirtyFile: (key: DirtyKey, path: string) => void
  clearDirty: (key: DirtyKey) => void
  clearAll: () => void
}

export const useDirtyFilesStore = create<DirtyFilesState>((set) => ({
  dirty: {},
  setDirtyFile: (key, path, content) =>
    set((state) => ({
      dirty: {
        ...state.dirty,
        [key]: { ...(state.dirty[key] ?? {}), [path]: content },
      },
    })),
  setDirtyFiles: (key, patch) =>
    set((state) => ({
      dirty: {
        ...state.dirty,
        [key]: { ...(state.dirty[key] ?? {}), ...patch },
      },
    })),
  removeDirtyFile: (key, path) =>
    set((state) => {
      const next = { ...(state.dirty[key] ?? {}) }
      delete next[path]
      const nextAll = { ...state.dirty }
      if (Object.keys(next).length === 0) delete nextAll[key]
      else nextAll[key] = next
      return { dirty: nextAll }
    }),
  clearDirty: (key) =>
    set((state) => {
      if (!state.dirty[key]) return state
      const next = { ...state.dirty }
      delete next[key]
      return { dirty: next }
    }),
  clearAll: () => set({ dirty: {} }),
}))

export const getDirtyForKey = (key: DirtyKey | null): Record<string, string> => {
  if (!key) return {}
  return useDirtyFilesStore.getState().dirty[key] ?? {}
}

export const hasDirtyForKey = (key: DirtyKey | null): boolean => {
  if (!key) return false
  const map = useDirtyFilesStore.getState().dirty[key]
  return !!map && Object.keys(map).length > 0
}
