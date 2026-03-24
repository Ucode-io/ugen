'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  PlusCircle,
  CloudUpload,
  Search,
  Filter,
  AlertCircle,
  FileQuestion,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { FileItem, useFilesInfinite, useDeleteFiles } from '@/entities/media-file'
import { useMediaGallery } from '../lib/use-media-gallery'
import { MediaCard } from './media-card'
import { MediaActionBar } from './media-action-bar'
import { FileUploadModal } from '@/features/file-upload'
import { MediaViewerModal } from './media-viewer-modal'
import { Button } from '@/shared/ui/ui/button'
import { cn } from '@/shared/lib/utils/cn'
import { MediaSkeleton } from './media-skeleton'
import { useEffect, useRef } from 'react'

interface MediaGalleryProps {
  initialFiles?: FileItem[];
  isLoading?: boolean;
  activeMenuId?: string;
  folderPath?: string;
}

export const MediaGallery = ({
  initialFiles,
  isLoading: propIsLoading = false,
  activeMenuId = 'media',
  folderPath = 'media'
}: MediaGalleryProps) => {
  const {
    data,
    isLoading: isQueryLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = useFilesInfinite(20)

  const { mutate: deleteFiles, isPending: isDeleting } = useDeleteFiles()

  // Observer for infinite scrool
  const observerRef = useRef<IntersectionObserver | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isFetchingNextPage || !hasNextPage) return

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        fetchNextPage()
      }
    }, { threshold: 1.0 })

    if (bottomRef.current) {
      observer.observe(bottomRef.current)
    }

    observerRef.current = observer
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const files = useMemo(() => {
    if (!data?.pages) return initialFiles || []
    return data.pages.flatMap(p => Array.isArray(p?.files) ? p.files : [])
  }, [data, initialFiles])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [previewIndex, setPreviewIndex] = useState<number | null>(null)

  const isLoading = propIsLoading || (isQueryLoading && files.length === 0)

  const cdnUrl = process.env.NEXT_PUBLIC_CDN_BASE_URL

  const {
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
  } = useMediaGallery(files)

  const filteredFiles = useMemo(() => {
    if (!files || files.length === 0) return []

    const validFiles = files.filter(Boolean)

    if (!searchQuery) return validFiles.map(f => ({ ...f, link: `${cdnUrl}/${f?.link}` }))

    return validFiles.filter(f =>
      f.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.file_name_disk?.toLowerCase().includes(searchQuery.toLowerCase())
    ).map(f => ({ ...f, link: `${cdnUrl}/${f?.link}` }))
  }, [files, searchQuery, cdnUrl])

  const handleDelete = () => {
    if (selectedIds.size === 0) return

    const filesToDelete = files
      .filter(f => selectedIds.has(f.id))
      .map(f => ({ object_id: f.id, object_name: f.file_name_disk }))

    deleteFiles(filesToDelete, {
      onSuccess: () => {
        // toast.success(`Successfully deleted ${filesToDelete.length} file(s)`)
        clearSelection()
        refetch()
      },
      onError: () => {
        // toast.error('Failed to delete files')
      }
    })
  }

  const handlePreview = useCallback((item: FileItem) => {
    const index = filteredFiles.findIndex((f) => f.id === item.id)
    if (index !== -1) setPreviewIndex(index)
  }, [filteredFiles])

  return (
    <div className="flex h-full w-full flex-col">
      {/* Media Header Controls */}
      <MediaActionBar
        selectedCount={selectedCount}
        isAllSelected={isAllSelected}
        onSelectAllToggle={handleSelectAllToggle}
        onDelete={handleDelete}
        onCreateOpen={() => setIsModalOpen(true)}
        gridColumns={gridColumns}
        onCycleGrid={cycleGridColumns}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isDeleting={isDeleting}
        isSelectionMode={isSelectionMode}
        onEnterSelectionMode={enterSelectionMode}
        onExitSelectionMode={exitSelectionMode}
      />

      {/* Grid Content */}
      <div className="relative flex-1">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              layout
              className={cn(
                "grid gap-4",
                gridColumns === 7 &&
                  "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7",
                gridColumns === 5 &&
                  "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
                gridColumns === 4 &&
                  "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
                gridColumns === 3 &&
                  "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
              )}
            >
              <MediaSkeleton count={gridColumns * 2} />
            </motion.div>
          ) : isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex min-h-[400px] flex-col items-center justify-center gap-6 text-center"
            >
              <div className="bg-destructive/10 flex h-20 w-20 items-center justify-center rounded-2xl">
                <AlertCircle className="text-destructive h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-text-main text-xl font-bold">
                  Failed to load files
                </h3>
                <p className="text-text-muted max-w-[300px]">
                  Something went wrong while fetching the data. Please check
                  your connection.
                </p>
              </div>
              <Button
                onClick={() => refetch()}
                variant="outline"
                className="h-12 rounded-xl px-8"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </motion.div>
          ) : filteredFiles.length === 0 && !searchQuery ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex min-h-[400px] flex-col items-center justify-center gap-6 text-center"
            >
              <div className="group hover:border-primary/40 relative rounded-[32px] border-2 border-dashed border-white/10 bg-white/5 p-10 shadow-inner transition-all duration-500">
                <div className="bg-primary/10 mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                  <CloudUpload className="text-primary h-10 w-10" />
                </div>
                <h3 className="text-text-main text-xl font-bold">
                  No Assets Yet
                </h3>
                <p className="text-text-muted mt-2 max-w-[280px]">
                  Your media gallery is empty. Upload your first image, video,
                  or document to get started.
                </p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-primary hover:bg-primary/90 shadow-primary/20 mt-8 h-auto scale-102 rounded-2xl px-8 py-6 text-lg font-bold text-white shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                  <PlusCircle className="mr-2 h-6 w-6" />
                  Create item
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative"
            >
              <LayoutGroup>
                <motion.div
                  layout
                  className={cn(
                    "grid gap-4 transition-[grid-template-columns] duration-500 ease-in-out",
                    gridColumns === 7 &&
                      "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7",
                    gridColumns === 5 &&
                      "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
                    gridColumns === 4 &&
                      "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
                    gridColumns === 3 &&
                      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                  )}
                >
                  <AnimatePresence>
                    {filteredFiles.map((file) => (
                      <MediaCard
                        key={file.id}
                        item={file}
                        isSelected={selectedIds.has(file.id)}
                        onToggle={toggleSelection}
                        isSelectionMode={isSelectionMode}
                        onPreview={handlePreview}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </LayoutGroup>

              {/* Bottom sentinel for infinite scroll */}
              <div
                ref={bottomRef}
                className="flex h-20 items-center justify-center py-8"
              >
                {isFetchingNextPage && (
                  <div className="text-primary flex items-center gap-2 font-medium">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Loading more...</span>
                  </div>
                )}
                {!hasNextPage && files.length > 19 && (
                  <div className="text-text-muted text-sm font-medium">
                    You've reached the end
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Modal (Feature-based) */}
      <FileUploadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        folderName={folderPath}
        onSuccess={() => refetch()}
      />

      <MediaViewerModal
        files={filteredFiles}
        initialIndex={previewIndex ?? 0}
        isOpen={previewIndex !== null}
        onClose={() => setPreviewIndex(null)}
      />
    </div>
  );
}
