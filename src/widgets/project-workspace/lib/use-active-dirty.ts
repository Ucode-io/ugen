import { useMemo } from 'react'
import { useCodeSelectionStore } from '@/entities/project/model/code-selection-store'
import { getDirtyKey, useDirtyFilesStore } from '@/entities/project/model/dirty-files-store'

/**
 * Reactive view of the dirty files for the currently active code selection.
 * Returns the dirty map (path -> content), the dirty paths, and a hasDirty flag.
 */
export const useActiveDirty = () => {
  const selection = useCodeSelectionStore((s) => s.activeCodeSelection)
  const key = useMemo(() => getDirtyKey(selection), [selection])
  const dirtyMap = useDirtyFilesStore((s) => (key ? s.dirty[key] : undefined))

  return useMemo(() => {
    const map = dirtyMap ?? {}
    const paths = Object.keys(map)
    return {
      key,
      selection,
      dirtyMap: map,
      dirtyPaths: paths,
      hasDirty: paths.length > 0,
    }
  }, [key, selection, dirtyMap])
}
