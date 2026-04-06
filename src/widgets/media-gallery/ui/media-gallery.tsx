'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import {
  PlusCircle,
  CloudUpload,
  Search,
  AlertCircle,
  FileQuestion,
  Loader2,
  RefreshCw,
  Folder,
  Home,
  ChevronRight,
  Upload,
  LayoutGrid,
  List,
  FolderPlus,
  Trash2,
  CheckSquare,
  X,
  XCircle,
  CheckCircle2,
} from 'lucide-react'
import { FileItem, useFilesInfinite, useDeleteFiles } from '@/entities/media-file'
import { useMediaGallery } from '../lib/use-media-gallery'
import { MediaCard } from './media-card'
import { FileUploadModal } from '@/features/file-upload'
import { MediaViewerModal } from './media-viewer-modal'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, UsageIndicator } from '@/shared/ui'
import { cn } from '@/shared/lib/utils/cn'
import { MediaSkeleton } from './media-skeleton'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

interface BreadcrumbItem {
  id: string
  label: string
}

interface MediaGalleryProps {
  initialFiles?: FileItem[]
  isLoading?: boolean
  activeMenuId?: string
  folderPath?: string
  folders?: any[]
}

export const MediaGallery = ({
  initialFiles,
  isLoading: propIsLoading = false,
  activeMenuId = 'media',
  folderPath = 'media',
  folders = []
}: MediaGalleryProps) => {
  const t = useTranslations('widgets.mediaGallery')
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

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (isFetchingNextPage || !hasNextPage) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) fetchNextPage()
    }, { threshold: 1.0 })
    if (bottomRef.current) observer.observe(bottomRef.current)
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([{ id: 'root', label: 'Root' }])
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)

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
      onSuccess: () => { clearSelection(); refetch() },
    })
  }

  const handlePreview = useCallback((item: FileItem) => {
    const index = filteredFiles.findIndex((f) => f.id === item.id)
    if (index !== -1) setPreviewIndex(index)
  }, [filteredFiles])

  const computedFolders = useMemo(() => {
    const storages = new Set<string>()
    files.forEach(f => {
      if (f.storage) storages.add(f.storage)
    })
    // If folders are also passed as props, we could merge them, but the user implies derivation
    const derived = Array.from(storages).map(s => ({ id: s, label: s, type: 'FOLDER' }))
    return derived
  }, [files])

  const displayFiles = useMemo(() => {
    // If searching, we might want to show everything or stay in folder.
    // Let's stay in folder for consistency unless searching.
    // If not searching:
    return filteredFiles.filter(f => {
      if (!activeFolderId) return !f.storage || f.storage === '' || f.storage === 'root'
      return f.storage === activeFolderId
    })
  }, [filteredFiles, activeFolderId])

  const handleFolderClick = (folder: any) => {
    setActiveFolderId(folder.id)
    setBreadcrumb(prev => {
      if (prev.some(b => b.id === folder.id)) return prev
      return [...prev, { id: folder.id, label: folder.label }]
    })
  }

  const handleBreadcrumbClick = (index: number) => {
    setBreadcrumb(prev => prev.slice(0, index + 1))
    if (index === 0) {
      setActiveFolderId(null)
    } else {
      setActiveFolderId(breadcrumb[index].id)
    }
  }

  const gridClass = cn(
    "grid gap-4 transition-[grid-template-columns] duration-500 ease-in-out",
    gridColumns === 7 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7",
    gridColumns === 5 && "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
    gridColumns === 4 && "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
    gridColumns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  )

  return (
    <div className="flex h-full w-full flex-col bg-bg-main overflow-y-auto pl-2 pr-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 mt-4">
        <div className="flex-1">
          <h1 className="text-[22px] font-bold text-text-main mb-1">Files</h1>
          <p className="text-[13px] text-text-muted">Manage uploaded files and media assets</p>
        </div>
        <UsageIndicator 
          label="Storage" 
          value="2.4 GB" 
          total="10 GB" 
          percentage={24} 
        />
        <Button variant="default" size="sm" className="bg-primary hover:bg-primary/90 text-white rounded-lg h-8 px-3 text-[13px]">
          Upgrade Plan
        </Button>
      </div>

      {/* S3 Bucket select */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex flex-col">
          <label className="text-[11px] font-medium text-text-muted mb-1">S3 Bucket</label>
          <div className="w-[260px]">
            <Select defaultValue="propel-media-prod">
              <SelectTrigger className="h-9 px-3 text-[13px] rounded-lg border-border-subtle bg-bg-card">
                <SelectValue placeholder="Select bucket" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="propel-media-prod">propel-media-prod</SelectItem>
                <SelectItem value="propel-media-staging">propel-media-staging</SelectItem>
                <SelectItem value="propel-backups">propel-backups</SelectItem>
                <SelectItem value="propel-exports">propel-exports</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative group flex-1 max-w-[320px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted transition-colors group-focus-within:text-primary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-bg-card border border-border-subtle text-[13px] text-text-main placeholder:text-text-muted transition-all outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Grid/List toggle */}
        <div className="flex border border-border-subtle rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-2 transition-colors",
              viewMode === 'grid' ? "bg-primary text-white" : "bg-bg-card text-text-muted hover:bg-bg-sidebar"
            )}
            title="Grid View"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              "p-2 transition-colors border-l border-border-subtle",
              viewMode === 'list' ? "bg-primary text-white" : "bg-bg-card text-text-muted hover:bg-bg-sidebar"
            )}
            title="List View"
          >
            <List size={16} />
          </button>
        </div>

        <div className="flex-1" />

        {/* Selection controls */}
        {!isSelectionMode ? (
          <Button
            variant="outline"
            size="sm"
            onClick={enterSelectionMode}
            className="text-[13px] h-8 px-3 rounded-lg border-border-subtle"
          >
            <CheckSquare className="w-4 h-4 mr-1.5 text-primary" />
            {t('select')}
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllToggle}
              className="text-[13px] h-8 px-3 rounded-lg border-border-subtle"
            >
              {isAllSelected ? (
                <XCircle className="w-4 h-4 mr-1.5 text-destructive" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-primary" />
              )}
              {isAllSelected ? t('deselectAll') : t('selectAll')}
            </Button>
            {selectedCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-8 px-3 text-[13px] rounded-lg"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-1.5" />
                )}
                {isDeleting ? t('deleting') : t('deleteCount', { count: selectedCount })}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={exitSelectionMode}
              className="h-8 px-3 text-[13px] rounded-lg text-text-muted"
            >
              <X className="w-4 h-4 mr-1.5" />
              {t('cancel')}
            </Button>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="text-[13px] h-8 px-3 rounded-lg border-border-subtle"
        >
          <FolderPlus className="w-4 h-4 mr-1.5" />
          New Folder
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="text-[13px] h-8 px-3 rounded-lg bg-primary hover:bg-primary/90 text-white"
        >
          <Upload className="w-4 h-4 mr-1.5" />
          Upload Files
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 mb-4 text-[13px]">
        {breadcrumb.map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 && <ChevronRight size={12} className="text-text-muted" />}
            <button
              onClick={() => handleBreadcrumbClick(index)}
              className={cn(
                "flex items-center gap-1 transition-colors hover:text-primary",
                index === breadcrumb.length - 1
                  ? "text-text-main font-medium"
                  : "text-primary"
              )}
            >
              {index === 0 && <Home size={12} className="mr-0.5" />}
              {item.label}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Content */}
      <div className="relative flex-1">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div layout className={gridClass}>
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
                <h3 className="text-text-main text-xl font-bold">{t('failedToLoad')}</h3>
                <p className="text-text-muted max-w-[300px]">{t('errorDescription')}</p>
              </div>
              <Button onClick={() => refetch()} variant="outline" className="h-10 rounded-lg px-6">
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('retry')}
              </Button>
            </motion.div>
          ) : displayFiles.length === 0 && (activeFolderId ? true : computedFolders.length === 0) && !searchQuery ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex min-h-[460px] flex-col items-center justify-center text-center p-8 bg-bg-card border border-dashed border-border-subtle rounded-2xl"
            >
              <div className="bg-primary/5 p-5 rounded-full mb-5">
                <CloudUpload className="text-primary/40 h-10 w-10" />
              </div>
              <h3 className="text-text-main text-xl font-bold tracking-tight">
                {t('noAssets')}
              </h3>
              <p className="text-text-muted mt-2 max-w-[320px] text-[14px]">
                {t('emptyDescription')}
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white mt-8 h-10 px-8 rounded-lg font-semibold shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('createItem')}
              </Button>
            </motion.div>
          ) : viewMode === 'list' ? (
            /* List View */
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border-subtle bg-bg-sidebar">
                      {isSelectionMode && (
                         <th className="w-10 px-4 py-2">
                           {/* Select all is done from the top bar, so we just space this head */}
                         </th>
                      )}
                      <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Name</th>
                      <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Type</th>
                      <th className="text-left px-4 py-2 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!activeFolderId && computedFolders.map(folder => (
                      <tr
                        key={folder.id}
                        onClick={() => handleFolderClick(folder)}
                        className={cn(
                          "border-b border-border-subtle cursor-pointer transition-colors hover:bg-bg-sidebar"
                        )}
                      >
                        {isSelectionMode && <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()} />}
                        <td className="px-4 py-2.5 flex items-center gap-2">
                          <Folder className="w-4 h-4 text-primary" />
                          <span className="text-[13px] font-medium text-text-main">{folder.label}</span>
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-text-muted">Folder</td>
                        <td className="px-4 py-2.5 text-[12px] text-text-muted">—</td>
                      </tr>
                    ))}
                    {displayFiles.map(file => {
                      const isSelected = selectedIds.has(file.id);
                      return (
                        <tr
                          key={file.id}
                          onClick={() => isSelectionMode ? toggleSelection(file.id) : handlePreview(file)}
                          className={cn(
                            "border-b border-border-subtle cursor-pointer transition-colors last:border-b-0",
                            isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-bg-sidebar"
                          )}
                        >
                          {isSelectionMode && (
                            <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                              <div
                                onClick={() => toggleSelection(file.id)}
                                className={cn(
                                  "w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer",
                                  isSelected ? "bg-primary border-primary" : "border-border-muted"
                                )}
                              >
                                {isSelected && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-2.5 flex items-center gap-2">
                            <FileQuestion className="w-4 h-4 text-text-muted" />
                            <span className="text-[13px] text-text-main truncate max-w-[300px]">{file.title || file.file_name_disk}</span>
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-text-muted uppercase">
                            {file.file_name_disk?.split('.').pop() || '—'}
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-text-muted">—</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            /* Grid View */
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
              <LayoutGroup>
                <motion.div layout className={gridClass}>
                  <AnimatePresence>
                    {!activeFolderId && computedFolders.map(folder => (
                      <motion.div
                        key={folder.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => handleFolderClick(folder)}
                        className="group relative bg-bg-card border border-border-subtle rounded-xl overflow-hidden cursor-pointer transition-all duration-150 flex flex-col shadow-sm hover:border-[#004eea]"
                      >
                        <div className="w-full h-[120px] relative flex items-center justify-center overflow-hidden bg-bg-subtle group-hover:bg-[#004eea]/5 transition-colors">
                          <Folder className="w-12 h-12 text-[#004eea]/60 group-hover:text-[#004eea] transition-colors" />
                        </div>
                        <div className="p-3 bg-bg-card flex flex-col justify-center border-t border-border-subtle flex-1">
                          <div className="text-[12px] font-medium text-text-main whitespace-nowrap overflow-hidden text-ellipsis group-hover:text-primary transition-colors">
                            {folder.label}
                          </div>
                          <div className="text-[11px] text-text-muted mt-0.5 flex justify-between items-center">
                            <span>&nbsp;</span>
                            <span className="uppercase text-[9px] font-semibold opacity-70">FOLDER</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {displayFiles.map((file) => (
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
              <div ref={bottomRef} className="flex h-20 items-center justify-center py-8">
                {isFetchingNextPage && (
                  <div className="text-primary flex items-center gap-2 font-medium">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{t('loadingMore')}</span>
                  </div>
                )}
                {!hasNextPage && files.length > 19 && (
                  <div className="text-text-muted text-sm font-medium">{t('reachedEnd')}</div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Modal */}
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
  )
}
