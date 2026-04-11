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
import { useQuery } from "@tanstack/react-query";
import { FileItem, useFilesInfinite, useDeleteFiles } from '@/entities/media-file'
import { useMediaGallery } from '../lib/use-media-gallery'
import { MediaCard } from './media-card'
import { FileUploadModal } from '@/features/file-upload'
import { MediaViewerModal } from './media-viewer-modal'
import { Button, UsageIndicator } from "@/shared/ui";
import { api } from "@/shared/api";
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

  const { data: pricingData, refetch: refetchPricing } = useQuery({
    queryKey: ["pricing-all"],
    queryFn: async () => {
      const { data } = await api.get("/v1/pricing/all");
      return data;
    },
    staleTime: 0,
  });

  const { mutate: deleteFiles, isPending: isDeleting } = useDeleteFiles();

  // Infinite scroll observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isFetchingNextPage || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNextPage();
      },
      { threshold: 1.0 },
    );
    if (bottomRef.current) observer.observe(bottomRef.current);
    observerRef.current = observer;
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const files = useMemo(() => {
    if (!data?.pages) return initialFiles || [];
    return data.pages.flatMap((p) => (Array.isArray(p?.files) ? p.files : []));
  }, [data, initialFiles]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: "root", label: "Root" },
  ]);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const isLoading = propIsLoading || (isQueryLoading && files.length === 0);
  const cdnUrl = process.env.NEXT_PUBLIC_CDN_BASE_URL;

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
  } = useMediaGallery(files);

  // Storage usage from backend
  const assetSize = pricingData?.data?.asset_size;
  const unit = assetSize?.unit ?? 'MB'
  const storageUsed = assetSize ? `${(assetSize.current || 0).toFixed(2)} ${unit}` : '0 MB'
  const storageTotal = assetSize ? `${(assetSize.limit || 0).toFixed(2)} ${unit}` : '0 MB'
  const storagePercentage = assetSize?.limit
    ? Math.min(((assetSize.current || 0) / assetSize.limit) * 100, 100)
    : 0;

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
      onSuccess: () => { clearSelection(); refetch(); refetchPricing() },
    })
  }

  const handlePreview = useCallback((item: FileItem) => {
    const index = filteredFiles.findIndex((f) => f.id === item.id)
    if (index !== -1) setPreviewIndex(index)
  }, [filteredFiles])

  const computedFolders = useMemo(() => {
    const storages = new Set<string>()
    files.forEach((f) => {
      if (f.storage) storages.add(f.storage);
    });
    const derived = Array.from(storages).map(s => ({ id: s, label: s, type: 'FOLDER' }))
    return derived
  }, [files])

  const displayFiles = useMemo(() => {
    return filteredFiles.filter((f) => {
      if (!activeFolderId)
        return !f.storage || f.storage === "" || f.storage === "root";
      return f.storage === activeFolderId;
    });
  }, [filteredFiles, activeFolderId]);

  const handleToggle = useCallback(
    (id: string, shiftKey?: boolean) => {
      toggleSelection(id, shiftKey, displayFiles);
    },
    [toggleSelection, displayFiles],
  );

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
    <div className="bg-bg-main flex h-full w-full flex-col overflow-y-auto pr-6 pl-2">
      {/* Header */}
      <div className="mt-4 mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <h1 className="text-text-main mb-1 text-[22px] font-bold">Files</h1>
          <p className="text-text-muted text-[13px]">
            Manage uploaded files and media assets
          </p>
        </div>
        <UsageIndicator
          label="Storage"
          value={storageUsed}
          total={storageTotal}
          percentage={storagePercentage}
        />
        <Button
          variant="default"
          size="sm"
          className="bg-primary hover:bg-primary/90 h-8 rounded-lg px-3 text-[13px] text-white"
        >
          Upgrade Plan
        </Button>
      </div>

      {/* Action Bar */}
      <div className="mb-4 flex items-center gap-2">
        {/* Search */}
        <div className="group relative max-w-[320px] flex-1">
          <Search className="text-text-muted group-focus-within:text-primary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="bg-bg-card border-border-subtle text-text-main placeholder:text-text-muted focus:border-primary focus:ring-primary/20 h-9 w-full rounded-lg border pr-4 pl-9 text-[13px] transition-all outline-none focus:ring-2"
          />
        </div>

        {/* Grid/List toggle */}
        <div className="border-border-subtle flex overflow-hidden rounded-lg border">
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-2 transition-colors",
              viewMode === "grid"
                ? "bg-primary text-white"
                : "bg-bg-card text-text-muted hover:bg-bg-sidebar",
            )}
            title="Grid View"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "border-border-subtle border-l p-2 transition-colors",
              viewMode === "list"
                ? "bg-primary text-white"
                : "bg-bg-card text-text-muted hover:bg-bg-sidebar",
            )}
            title="List View"
          >
            <List size={16} />
          </button>
        </div>

        <div className="flex-1" />

        {/* Selection controls — visible only when items are selected */}
        {isSelectionMode && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAllToggle(displayFiles)}
              className="border-border-subtle h-8 rounded-lg px-3 text-[13px]"
            >
              {isAllSelected ? (
                <XCircle className="text-destructive mr-1.5 h-4 w-4" />
              ) : (
                <CheckCircle2 className="text-primary mr-1.5 h-4 w-4" />
              )}
              {isAllSelected ? t("deselectAll") : t("selectAll")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8 rounded-lg px-3 text-[13px]"
            >
              {isDeleting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-4 w-4" />
              )}
              {isDeleting
                ? t("deleting")
                : t("deleteCount", { count: selectedCount })}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-text-muted h-8 rounded-lg px-3 text-[13px]"
            >
              <X className="mr-1.5 h-4 w-4" />
              {t("cancel")}
            </Button>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="border-border-subtle h-8 rounded-lg px-3 text-[13px]"
        >
          <FolderPlus className="mr-1.5 h-4 w-4" />
          New Folder
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary/90 h-8 rounded-lg px-3 text-[13px] text-white"
        >
          <Upload className="mr-1.5 h-4 w-4" />
          Upload Files
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-1 text-[13px]">
        {breadcrumb.map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 && (
              <ChevronRight size={12} className="text-text-muted" />
            )}
            <button
              onClick={() => handleBreadcrumbClick(index)}
              className={cn(
                "hover:text-primary flex items-center gap-1 transition-colors",
                index === breadcrumb.length - 1
                  ? "text-text-main font-medium"
                  : "text-primary",
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
                <h3 className="text-text-main text-xl font-bold">
                  {t("failedToLoad")}
                </h3>
                <p className="text-text-muted max-w-[300px]">
                  {t("errorDescription")}
                </p>
              </div>
              <Button
                onClick={() => { refetch(); refetchPricing() }}
                variant="outline"
                className="h-10 rounded-lg px-6"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("retry")}
              </Button>
            </motion.div>
          ) : displayFiles.length === 0 &&
            (activeFolderId ? true : computedFolders.length === 0) &&
            !searchQuery ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-bg-card border-border-subtle flex min-h-[460px] flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center"
            >
              <div className="bg-primary/5 mb-5 rounded-full p-5">
                <CloudUpload className="text-primary/40 h-10 w-10" />
              </div>
              <h3 className="text-text-main text-xl font-bold tracking-tight">
                {t("noAssets")}
              </h3>
              <p className="text-text-muted mt-2 max-w-[320px] text-[14px]">
                {t("emptyDescription")}
              </p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="bg-primary hover:bg-primary/90 mt-8 h-10 rounded-lg px-8 font-semibold text-white shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                {t("createItem")}
              </Button>
            </motion.div>
          ) : viewMode === "list" ? (
            /* List View */
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="bg-bg-card border-border-subtle overflow-hidden rounded-xl border shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="border-border-subtle bg-bg-sidebar border-b">
                      {isSelectionMode && <th className="w-10 px-4 py-2" />}
                      <th className="text-text-muted px-4 py-2 text-left text-[11px] font-semibold tracking-wider uppercase">
                        Name
                      </th>
                      <th className="text-text-muted px-4 py-2 text-left text-[11px] font-semibold tracking-wider uppercase">
                        Type
                      </th>
                      <th className="text-text-muted px-4 py-2 text-left text-[11px] font-semibold tracking-wider uppercase">
                        Size
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {!activeFolderId &&
                      computedFolders.map((folder) => (
                        <tr
                          key={folder.id}
                          onClick={() => handleFolderClick(folder)}
                          className={cn(
                            "border-border-subtle hover:bg-bg-sidebar cursor-pointer border-b transition-colors",
                          )}
                        >
                          {isSelectionMode && (
                            <td
                              className="px-4 py-2.5"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <td className="flex items-center gap-2 px-4 py-2.5">
                            <Folder className="text-primary h-4 w-4" />
                            <span className="text-text-main text-[13px] font-medium">
                              {folder.label}
                            </span>
                          </td>
                          <td className="text-text-muted px-4 py-2.5 text-[12px]">
                            Folder
                          </td>
                          <td className="text-text-muted px-4 py-2.5 text-[12px]">
                            —
                          </td>
                        </tr>
                      ))}
                    {displayFiles.map((file) => {
                      const isSelected = selectedIds.has(file.id);
                      return (
                        <tr
                          key={file.id}
                          onClick={(e) =>
                            isSelectionMode
                              ? handleToggle(file.id, e.shiftKey)
                              : handlePreview(file)
                          }
                          className={cn(
                            "border-border-subtle cursor-pointer border-b transition-colors last:border-b-0",
                            isSelected
                              ? "bg-primary/5 hover:bg-primary/10"
                              : "hover:bg-bg-sidebar",
                          )}
                        >
                          {isSelectionMode && (
                            <td
                              className="px-4 py-2.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggle(file.id, e.shiftKey);
                                }}
                                className={cn(
                                  "flex h-4 w-4 cursor-pointer items-center justify-center rounded border transition-all",
                                  isSelected
                                    ? "bg-primary border-primary"
                                    : "border-border-muted",
                                )}
                              >
                                {isSelected && (
                                  <CheckSquare className="h-3.5 w-3.5 text-white" />
                                )}
                              </div>
                            </td>
                          )}
                          <td className="flex items-center gap-2 px-4 py-2.5">
                            <FileQuestion className="text-text-muted h-4 w-4" />
                            <span className="text-text-main max-w-[300px] truncate text-[13px]">
                              {file.title || file.file_name_disk}
                            </span>
                          </td>
                          <td className="text-text-muted px-4 py-2.5 text-[12px] uppercase">
                            {file.file_name_disk?.split(".").pop() || "—"}
                          </td>
                          <td className="text-text-muted px-4 py-2.5 text-[12px]">
                            —
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            /* Grid View */
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative"
            >
              <LayoutGroup>
                <motion.div layout className={gridClass}>
                  <AnimatePresence>
                    {!activeFolderId &&
                      computedFolders.map((folder) => (
                        <motion.div
                          key={folder.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          onClick={() => handleFolderClick(folder)}
                          className="group bg-bg-card border-border-subtle relative flex cursor-pointer flex-col overflow-hidden rounded-xl border shadow-sm transition-all duration-150 hover:border-[#004eea]"
                        >
                          <div className="bg-bg-subtle relative flex h-[120px] w-full items-center justify-center overflow-hidden transition-colors group-hover:bg-[#004eea]/5">
                            <Folder className="h-12 w-12 text-[#004eea]/60 transition-colors group-hover:text-[#004eea]" />
                          </div>
                          <div className="bg-bg-card border-border-subtle flex flex-1 flex-col justify-center border-t p-3">
                            <div className="text-text-main group-hover:text-primary overflow-hidden text-[12px] font-medium text-ellipsis whitespace-nowrap transition-colors">
                              {folder.label}
                            </div>
                            <div className="text-text-muted mt-0.5 flex items-center justify-between text-[11px]">
                              <span>&nbsp;</span>
                              <span className="text-[9px] font-semibold uppercase opacity-70">
                                FOLDER
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    {displayFiles.map((file) => (
                      <MediaCard
                        key={file.id}
                        item={file}
                        isSelected={selectedIds.has(file.id)}
                        onToggle={handleToggle}
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
                    <span>{t("loadingMore")}</span>
                  </div>
                )}
                {!hasNextPage && files.length > 19 && (
                  <div className="text-text-muted text-sm font-medium">
                    {t("reachedEnd")}
                  </div>
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
        onSuccess={() => { refetch(); refetchPricing() }}
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
