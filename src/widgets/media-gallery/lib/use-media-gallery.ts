'use client'

import { useState, useCallback, useMemo } from 'react'
import { FileItem } from '@/entities/media-file/model/types'

export const useMediaGallery = (files: FileItem[]) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [gridColumns, setGridColumns] = useState<number>(7)
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null)

  // Selection mode is derived — active whenever anything is selected
  const isSelectionMode = selectedIds.size > 0

  const selectedIdsArray = useMemo(() => Array.from(selectedIds), [selectedIds])
  const selectedCount = selectedIds.size

  const toggleSelection = useCallback((id: string, shiftKey?: boolean, displayedFiles?: FileItem[]) => {
    const fileList = displayedFiles || files

    if (shiftKey && lastSelectedId) {
      const lastIndex = fileList.findIndex(f => f.id === lastSelectedId)
      const currentIndex = fileList.findIndex(f => f.id === id)
      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex)
        const end = Math.max(lastIndex, currentIndex)
        const rangeIds = fileList.slice(start, end + 1).map(f => f.id)
        setSelectedIds(prev => {
          const next = new Set(prev)
          rangeIds.forEach(rid => next.add(rid))
          return next
        })
        setLastSelectedId(id)
        return
      }
    }

    setLastSelectedId(id)
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [files, lastSelectedId])

  const selectAll = useCallback((displayedFiles?: FileItem[]) => {
    setSelectedIds(new Set((displayedFiles || files).map(f => f.id)))
  }, [files])

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const isAllSelected = useMemo(() =>
    files.length > 0 && selectedIds.size === files.length
  , [files, selectedIds.size])

  const handleSelectAllToggle = useCallback((displayedFiles?: FileItem[]) => {
    if (isAllSelected) deselectAll()
    else selectAll(displayedFiles)
  }, [isAllSelected, selectAll, deselectAll])

  const cycleGridColumns = useCallback(() => {
    setGridColumns(prev => {
      if (prev === 7) return 5
      if (prev === 5) return 4
      if (prev === 4) return 3
      return 7
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setLastSelectedId(null)
  }, [])

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
  }
}
