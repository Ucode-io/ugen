import { create } from 'zustand'

export interface DirtyFileEntry {
  path: string
  content: string
}

interface CommitParams {
  files: DirtyFileEntry[]
  defaultMessage?: string
  onSubmit: (commitMessage: string) => void | Promise<void>
}

interface UnsavedParams {
  files: DirtyFileEntry[]
  onSave: () => void | Promise<void>
  onDiscard: () => void
}

interface SaveFlowState {
  commitOpen: boolean
  commitParams: CommitParams | null
  unsavedOpen: boolean
  unsavedParams: UnsavedParams | null
  showCommitModal: (params: CommitParams) => void
  closeCommitModal: () => void
  showUnsavedModal: (params: UnsavedParams) => void
  closeUnsavedModal: () => void
}

export const useSaveFlowStore = create<SaveFlowState>((set) => ({
  commitOpen: false,
  commitParams: null,
  unsavedOpen: false,
  unsavedParams: null,
  showCommitModal: (params) => set({ commitOpen: true, commitParams: params }),
  closeCommitModal: () => set({ commitOpen: false, commitParams: null }),
  showUnsavedModal: (params) => set({ unsavedOpen: true, unsavedParams: params }),
  closeUnsavedModal: () => set({ unsavedOpen: false, unsavedParams: null }),
}))
