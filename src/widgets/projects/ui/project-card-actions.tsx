"use client"
import { useState, useRef, useEffect } from "react"
import { createPortal } from "react-dom"
import { MoreHorizontal, Trash2, Edit, MoveRight, FolderMinus, X, Plus } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"
import { useDeleteProject, useUpdateProject } from "@/entities/project"
import { useProjectFolders, useCreateProjectFolder, useDeleteProjectFolder, ProjectFolder } from "@/entities/project-folder"
import { useAuthStore } from "@/entities/session"
import { useQueryClient } from "@tanstack/react-query"
import { useTranslations } from "next-intl"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui"

interface ProjectCardActionsProps {
  project: {
    id: string
    name: string
    description?: string
  },
  folderItemId?: string
}

export const ProjectCardActions = ({ project, folderItemId }: ProjectCardActionsProps) => {
  const t = useTranslations('widgets.projects')
  const tCommon = useTranslations('widgets.common')
  const tNav = useTranslations('Navigation')
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false)
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")

  const buttonRef = useRef<HTMLButtonElement>(null)
  const popoverContentRef = useRef<HTMLDivElement>(null)
  const [popoverPos, setPopoverPos] = useState<{ top: number; right: number } | null>(null)

  const queryClient = useQueryClient()

  const isUgen = useAuthStore((s) => s.project?.is_ugen ?? false)

  const deleteProject = useDeleteProject()
  const updateProject = useUpdateProject()

  const { data: allFoldersData } = useProjectFolders(undefined, undefined, isUgen)
  const createFolder = useCreateProjectFolder()
  const deleteFolder = useDeleteProjectFolder()

  const [title, setTitle] = useState(project.name)
  const [description, setDescription] = useState(project.description || "")

  useEffect(() => {
    if (!isPopoverOpen) return
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPopoverPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popoverContentRef.current && !popoverContentRef.current.contains(target)
      ) {
        setIsPopoverOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isPopoverOpen])

  const handleDelete = async () => {
    try {
      await deleteProject.mutateAsync(project.id)
      setIsDeleteModalOpen(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdate = async () => {
    try {
      await updateProject.mutateAsync({
        id: project.id,
        title,
        description
      })
      setIsEditModalOpen(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleRemoveFromFolder = async () => {
    if (!folderItemId) return
    try {
      await deleteFolder.mutateAsync(folderItemId)
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project-folders'] })
      setIsPopoverOpen(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleMove = async () => {
    try {
      await createFolder.mutateAsync({
        label: project.name,
        type: "PROJECT",
        parent_id: selectedParentId,
        mcp_project_id: project.id,
        order_number: 1
      })

      if (folderItemId) {
        await handleRemoveFromFolder()
      } else {
        const existingMappings = allFoldersData?.filter((f: ProjectFolder) =>
          f.type?.toUpperCase() === 'PROJECT' && f.mcp_project_id === project.id
        ) || []

        for (const mapping of existingMappings) {
          await deleteFolder.mutateAsync(mapping.id)
        }
      }

      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['project-folders'] })
      setIsMoveModalOpen(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleCreateFolderInline = async () => {
    const label = newFolderName.trim()
    if (!label) return
    try {
      const result: any = await createFolder.mutateAsync({
        label,
        type: "FOLDER",
        parent_id: null,
        order_number: (allFoldersData?.filter((f: ProjectFolder) => f.type?.toUpperCase() === 'FOLDER').length || 0) + 1,
      })
      const newId =
        result?.data?.id ||
        result?.data?.response?.id ||
        result?.response?.id ||
        result?.id
      if (newId) setSelectedParentId(newId)
      setNewFolderName("")
      setIsCreatingFolder(false)
    } catch (e) {
      console.error(e)
    }
  }

  const closeMoveModal = () => {
    setIsMoveModalOpen(false)
    setIsCreatingFolder(false)
    setNewFolderName("")
  }

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setIsPopoverOpen(!isPopoverOpen)
        }}
        className="flex h-7 w-7 items-center justify-center rounded-md text-text-main hover:bg-hover-bg transition-colors"
      >
        <MoreHorizontal size={16} />
      </button>

      {isPopoverOpen && popoverPos && typeof document !== "undefined" && createPortal(
        <div
          ref={popoverContentRef}
          style={{ top: popoverPos.top, right: popoverPos.right }}
          className="fixed z-100 w-38 overflow-hidden rounded-lg border border-border-subtle bg-bg-card shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsEditModalOpen(true)
              setIsPopoverOpen(false)
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-main hover:bg-hover-bg transition-colors"
          >
            <Edit size={14} />
            {tNav("edit") || tCommon("edit")}
          </button>
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsMoveModalOpen(true)
              setIsPopoverOpen(false)
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-main hover:bg-hover-bg transition-colors whitespace-nowrap"
          >
            <MoveRight size={14} />
            {t("moveToFolder")}
          </button>
          {folderItemId && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleRemoveFromFolder()
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-main hover:bg-hover-bg transition-colors whitespace-nowrap"
            >
              <FolderMinus size={14} />
              {t("removeFromFolder")}
            </button>
          )}
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsDeleteModalOpen(true)
              setIsPopoverOpen(false)
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={14} />
            {tNav("delete") || tCommon("delete")}
          </button>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[120] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-subtle bg-bg-card p-6 shadow-2xl focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <Dialog.Title className="text-lg font-semibold text-text-main uppercase">
              {t("deleteProject")}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-text-muted">
              {t("deleteProjectDescription", { name: project.name })}
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-main hover:bg-hover-bg transition-colors">
                  {tCommon("cancel")}
                </button>
              </Dialog.Close>
              <button
                onClick={handleDelete}
                disabled={deleteProject.isPending}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleteProject.isPending ? tNav("deleting") || tCommon("deleting") || "Deleting..." : tCommon("delete")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Project Modal */}
      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[120] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-subtle bg-bg-card p-6 shadow-2xl focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <Dialog.Title className="text-lg font-semibold text-text-main uppercase">
              {t("editProject")}
            </Dialog.Title>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="title" className="text-sm font-medium text-text-main">
                  {tCommon("title") || "Title"}
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-border-subtle bg-bg-main px-3 py-2 text-sm text-text-main outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                  placeholder={t("projectName")}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="description" className="text-sm font-medium text-text-main">
                  {tCommon("description") || "Description"}
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[100px] rounded-lg border border-border-subtle bg-bg-main px-3 py-2 text-sm text-text-main outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all resize-none"
                  placeholder={t("projectDescriptionPlaceholder")}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-main hover:bg-hover-bg transition-colors">
                  {tCommon("cancel")}
                </button>
              </Dialog.Close>
              <button
                onClick={handleUpdate}
                disabled={updateProject.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {updateProject.isPending ? t("saving") : t("saveChanges")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Move Project Modal */}
      <Dialog.Root open={isMoveModalOpen} onOpenChange={(open) => (open ? setIsMoveModalOpen(true) : closeMoveModal())}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[120] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-subtle bg-bg-card p-6 shadow-2xl focus:outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <Dialog.Title className="text-lg font-semibold text-text-main uppercase">
              {t("moveProjectTitle")}
            </Dialog.Title>
            <div className="mt-5 space-y-3">
              <div className="space-y-2">
                <label className="text-text-muted text-[11px] font-semibold tracking-wider uppercase">
                  {t("selectFolder")}
                </label>
                <Select
                  value={selectedParentId ?? "__root__"}
                  onValueChange={(v) => setSelectedParentId(v === "__root__" ? null : v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder={t("selectFolder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__root__">{t("rootDirectory")}</SelectItem>
                    {allFoldersData?.filter((f: ProjectFolder) => f.type?.toUpperCase() === 'FOLDER').map((f: ProjectFolder) => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {isCreatingFolder ? (
                <div className="border-border-subtle bg-bg-sidebar/40 rounded-lg border p-3">
                  <div className="text-text-muted mb-2 text-[11px] font-semibold tracking-wider uppercase">
                    {t("createFolder")}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleCreateFolderInline()
                        if (e.key === "Escape") {
                          setIsCreatingFolder(false)
                          setNewFolderName("")
                        }
                      }}
                      placeholder={t("folderPlaceholder")}
                      className="border-border-subtle bg-bg-main text-text-main focus:border-primary/50 focus:ring-primary/10 h-9 flex-1 rounded-lg border px-3 text-sm outline-none transition-all focus:ring-4"
                    />
                    <button
                      type="button"
                      onClick={handleCreateFolderInline}
                      disabled={createFolder.isPending || !newFolderName.trim()}
                      className="bg-primary hover:bg-primary-hover h-9 rounded-lg px-3.5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                    >
                      {createFolder.isPending ? t("creating") : t("create")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingFolder(false)
                        setNewFolderName("")
                      }}
                      className="border-border-subtle text-text-muted hover:bg-hover-bg hover:text-text-main flex h-9 w-9 items-center justify-center rounded-lg border transition-colors"
                      aria-label={tCommon("cancel")}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreatingFolder(true)}
                  className="border-border-subtle hover:border-primary/50 hover:bg-primary/5 group flex w-full items-center gap-2.5 rounded-lg border border-dashed px-3 py-2.5 text-left transition-colors"
                >
                  <div className="bg-bg-sidebar text-text-muted group-hover:bg-primary group-hover:text-white flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors">
                    <Plus size={14} strokeWidth={2.5} />
                  </div>
                  <span className="text-text-main group-hover:text-primary text-sm font-medium transition-colors">
                    {t("createFolder")}
                  </span>
                </button>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-main hover:bg-hover-bg transition-colors">
                  {tCommon("cancel")}
                </button>
              </Dialog.Close>
              <button
                onClick={handleMove}
                disabled={createFolder.isPending || isCreatingFolder}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {createFolder.isPending ? t("moving") : tNav("move") || "Move"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
