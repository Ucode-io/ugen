'use client'

import React, { useState, useMemo } from 'react'
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
    selectedIdsArray
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

  return (
    <div className="flex flex-col h-full w-full">
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
      />

      {/* Grid Content */}
      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              layout
              className={cn(
                "grid gap-4",
                gridColumns === 7 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7",
                gridColumns === 5 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
                gridColumns === 4 && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
                gridColumns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              )}
            >
              <MediaSkeleton count={gridColumns * 2} />
            </motion.div>
          ) : isError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center"
            >
              <div className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="w-10 h-10 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-text-main">Failed to load files</h3>
                <p className="text-text-muted max-w-[300px]">
                  Something went wrong while fetching the data. Please check your connection.
                </p>
              </div>
              <Button onClick={() => refetch()} variant="outline" className="rounded-xl px-8 h-12">
                <RefreshCw className="mr-2 w-4 h-4" />
                Retry
              </Button>
            </motion.div>
          ) : filteredFiles.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center"
            >
              <div className="relative group p-10 rounded-[32px] border-2 border-dashed border-white/10 hover:border-primary/40 transition-all duration-500 bg-white/5 shadow-inner">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <CloudUpload className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-text-main">No Assets Yet</h3>
                <p className="text-text-muted mt-2 max-w-[280px]">
                  Your media gallery is empty. Upload your first image, video, or document to get started.
                </p>
                <Button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-8 px-8 py-6 rounded-2xl h-auto font-bold text-lg bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 scale-102 hover:scale-105 transition-all active:scale-95"
                >
                  <PlusCircle className="mr-2 w-6 h-6" />
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
                    gridColumns === 7 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7",
                    gridColumns === 5 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
                    gridColumns === 4 && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
                    gridColumns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  )}
                >
                  <AnimatePresence>
                    {filteredFiles.map((file) => (
                      <MediaCard
                        key={file.id}
                        item={file}
                        isSelected={selectedIds.has(file.id)}
                        onToggle={toggleSelection}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </LayoutGroup>

              {/* Bottom sentinel for infinite scroll */}
              <div ref={bottomRef} className="h-20 flex items-center justify-center py-8">
                {isFetchingNextPage && (
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Loading more...</span>
                  </div>
                )}
                {!hasNextPage && files.length > 0 && (
                  <div className="text-text-muted text-sm font-medium">You've reached the end</div>
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
    </div>
  )
}
