import { useCallback } from 'react'
import { toast } from 'sonner'
import { api } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { useChatStore } from '@/entities/chat'
import { useCodeSelectionStore } from '@/entities/project/model/code-selection-store'
import type { CodeSelectionFile } from '@/entities/project/model/code-selection-store'
import {
  getDirtyForKey, getDirtyKey, hasDirtyForKey, useDirtyFilesStore,
} from '@/entities/project/model/dirty-files-store'
import { useSaveFlowStore, type DirtyFileEntry } from '../model/save-flow-store'
import type { CodeEditorTarget } from '@/entities/session'

const dirtyEntries = (key: string | null): DirtyFileEntry[] => {
  const map = getDirtyForKey(key)
  return Object.entries(map).map(([path, content]) => ({ path, content }))
}

const extractErrorMessage = (err: any): string => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Save failed'
  )
}

interface SaveCallParams {
  selection: CodeEditorTarget
  files: DirtyFileEntry[]
  commitMessage: string
}

/** Make the actual PUT to the manual-save endpoint. Throws on failure. */
const callManualSave = async ({ selection, files, commitMessage }: SaveCallParams) => {
  const projectId = useChatStore.getState().projectId
  if (!projectId) throw new Error('No active project')

  const accessToken = useAuthStore.getState().accessToken
  const repoIdNum = selection.repoId != null ? Number(selection.repoId) : 0

  await api.put(
    `/v1/mcp_project/${projectId}/manual-save`,
    {
      repo_id: Number.isFinite(repoIdNum) ? repoIdNum : 0,
      commit_message: commitMessage,
      files: files.map((f) => ({ file_path: f.path, content: f.content })),
    },
    {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
  )
}

/**
 * Clear dirty entries that were just committed, but only if the user hasn't
 * edited them again while the request was in flight. Anything still matching
 * the committed snapshot is removed; newer edits stay dirty.
 */
const clearCommitted = (key: string, committed: DirtyFileEntry[]) => {
  const store = useDirtyFilesStore.getState()
  const current = store.dirty[key] ?? {}
  committed.forEach((f) => {
    if (current[f.path] === f.content) {
      store.removeDirtyFile(key, f.path)
    }
  })
}

/**
 * Promote saved content into activeCodeFiles so it becomes the new base.
 * Without this, clearing dirty would expose the stale pre-save content and the
 * preview would visually revert until a /codebase refetch lands.
 */
const applyCommittedToBase = (committed: DirtyFileEntry[]) => {
  const patch: CodeSelectionFile[] = committed.map((f) => ({ path: f.path, content: f.content }))
  useCodeSelectionStore.getState().patchCodeFiles(patch)
}

/**
 * Background refetch of the microfrontend's codebase after a save so any
 * server-side processing (lint fixes, generated files, etc.) is reflected.
 * Failures are silent — the local base is already up to date via
 * applyCommittedToBase, and dirty edits made during the in-flight refetch are
 * preserved by setActiveCodeSelection's dirty-merge.
 */
const refreshCodebaseInBackground = (selection: CodeEditorTarget) => {
  if (selection.kind !== 'microfrontend' || !selection.id) return
  const projectId = useChatStore.getState().projectId
  if (!projectId) return
  const apiKey = useAuthStore.getState().apiKey
  const headers = apiKey ? { Authorization: 'API-KEY', 'x-api-key': apiKey } : {}

  api
    .get(`/v2/function/${selection.id}/codebase`, {
      params: { 'project-id': projectId },
      headers,
    })
    .then(({ data }) => {
      const fetched = (data?.data?.files ?? []) as CodeSelectionFile[]
      if (!fetched.length) return
      const cur = useCodeSelectionStore.getState().activeCodeSelection
      // Bail if the user switched targets while the refetch was in flight
      if (cur?.kind !== 'microfrontend' || cur.id !== selection.id) return
      useCodeSelectionStore.getState().setActiveCodeSelection(cur, fetched)
    })
    .catch(() => { /* silent — local base is already correct */ })
}

/** Open the commit modal. Resolves after a successful save; rejects if user cancels or the request fails irrecoverably. */
export const requestSave = (
  selection: CodeEditorTarget | null,
  defaultMessage?: string,
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const key = getDirtyKey(selection)
    const files = dirtyEntries(key)
    if (!key || files.length === 0 || !selection) {
      resolve()
      return
    }

    let resolved = false

    useSaveFlowStore.getState().showCommitModal({
      files,
      defaultMessage,
      onSubmit: async (commitMessage) => {
        try {
          await callManualSave({ selection, files, commitMessage })
        } catch (err) {
          // Surface to the modal: don't clear dirty, don't close the modal
          throw new Error(extractErrorMessage(err))
        }
        // Promote the snapshot to the base BEFORE clearing dirty, otherwise
        // the preview briefly falls back to stale activeCodeFiles content.
        applyCommittedToBase(files)
        clearCommitted(key, files)
        refreshCodebaseInBackground(selection)
        toast.success('Saved')
        resolved = true
        resolve()
      },
    })

    const unsub = useSaveFlowStore.subscribe((state, prev) => {
      if (prev.commitOpen && !state.commitOpen) {
        unsub()
        if (!resolved) reject(new Error('commit-cancelled'))
      }
    })
  })
}

/** Auto-commit (no modal): used by theme + element-style-toolbar. On failure, dirty is preserved and a toast is shown. */
interface AutoCommitOptions {
  refreshCodebase?: boolean
}

export const autoCommit = async (
  selection: CodeEditorTarget | null,
  commitMessage: string,
  options: AutoCommitOptions = {},
) => {
  const key = getDirtyKey(selection)
  const files = dirtyEntries(key)
  if (!key || files.length === 0 || !selection) return
  try {
    await callManualSave({ selection, files, commitMessage })
    applyCommittedToBase(files)
    clearCommitted(key, files)
    if (options.refreshCodebase !== false) {
      refreshCodebaseInBackground(selection)
    }
    toast.success('Saved')
  } catch (err) {
    toast.error(extractErrorMessage(err))
  }
}

/**
 * Wrap an action so that, if there are dirty changes for the current selection,
 * we first show the unsaved-changes modal. The action only runs after Save or Discard.
 */
export const useGuardedAction = () => {
  return useCallback((action: () => void | Promise<void>): void => {
    const selection = useCodeSelectionStore.getState().activeCodeSelection
    const key = getDirtyKey(selection)
    if (!key || !hasDirtyForKey(key)) {
      void action()
      return
    }
    const files = dirtyEntries(key)
    useSaveFlowStore.getState().showUnsavedModal({
      files,
      onSave: () => {
        useSaveFlowStore.getState().closeUnsavedModal()
        requestSave(selection)
          .then(() => action())
          .catch(() => { /* user cancelled or save failed; abort action */ })
      },
      onDiscard: () => {
        useSaveFlowStore.getState().closeUnsavedModal()
        useDirtyFilesStore.getState().clearDirty(key)
        void action()
      },
    })
  }, [])
}
