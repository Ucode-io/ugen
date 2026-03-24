'use client'

import { useState, useCallback, useMemo } from 'react'
import { FileItem } from '@/entities/media-file/model/types'

export const useMediaGallery = (files: FileItem[]) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [gridColumns, setGridColumns] = useState<number>(7)
  const [isSelectionMode, setIsSelectionMode] = useState(false)

  // Memoize selectedIds to avoid unnecessary re-renders
  const selectedIdsArray = useMemo(() => Array.from(selectedIds), [selectedIds])
  const selectedCount = selectedIds.size

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(files.map((f) => f.id)))
  }, [files])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isAllSelected = useMemo(() =>
    files.length > 0 && selectedIds.size === files.length
    , [files, selectedIds.size])

  const handleSelectAllToggle = useCallback(() => {
    if (isAllSelected) deselectAll()
    else selectAll()
  }, [isAllSelected, selectAll, deselectAll])

  const cycleGridColumns = useCallback(() => {
    setGridColumns((prev) => {
      if (prev === 7) return 5
      if (prev === 5) return 4
      if (prev === 4) return 3
      return 7
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const enterSelectionMode = useCallback(() => setIsSelectionMode(true), [])
  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false)
    clearSelection()
  }, [clearSelection])

  return {
    selectedIds,
    toggleSelection,
    handleSelectAllToggle,
    isAllSelected,
    gridColumns,
    cycleGridColumns,
    selectedCount,
    clearSelection,
    selectedIdsArray,
    isSelectionMode,
    enterSelectionMode,
    exitSelectionMode
  }
}
