"use client"
import { useState, useRef, useEffect } from "react"
import { MoreHorizontal, Trash2, Edit, MoveRight, Plus } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"
import {
  useDeleteProjectFolder,
  useUpdateProjectFolder,
  useCreateProjectFolder,
  useProjectFolders
} from "@/entities/project-folder"
import { useProjectsList } from "@/entities/project"
import { ProjectFolder } from "@/entities/project-folder"
import { useTranslations } from "next-intl"

interface FolderCardActionsProps {
  folder: {
    id: string
    name: string
    rawFolder?: ProjectFolder
  }
}

export const FolderCardActions = ({ folder }: FolderCardActionsProps) => {
  const t = useTranslations('widgets.projects')
  const tCommon = useTranslations('widgets.common')
  const tNav = useTranslations('Navigation')
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false)
  const [isAddProjectsModalOpen, setIsAddProjectsModalOpen] = useState(false)

  const popoverRef = useRef<HTMLDivElement>(null)

  const deleteFolder = useDeleteProjectFolder()
  const updateFolder = useUpdateProjectFolder()
  const createFolder = useCreateProjectFolder()

  const [title, setTitle] = useState(folder.name)

  // For Move modal
  const { data: allFoldersData } = useProjectFolders()
  const [selectedParentId, setSelectedParentId] = useState<string | null>(folder.rawFolder?.parent_id || null)

  // For Add Projects modal
  const { data: projectsResponse } = useProjectsList()
  const rawData = projectsResponse?.response || projectsResponse?.data || projectsResponse
  const projectsList = Array.isArray(rawData) ? rawData : (rawData?.projects || [])
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPopoverOpen(false)
      }
    }
    if (isPopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isPopoverOpen])

  const handleDelete = async () => {
    try {
      await deleteFolder.mutateAsync(folder.id)
      setIsDeleteModalOpen(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdate = async () => {
    try {
      if (title.trim() && title !== folder.name) {
        await updateFolder.mutateAsync({
          id: folder.id,
          label: title.trim()
        })
      }
      setIsEditModalOpen(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleMove = async () => {
    try {
      await updateFolder.mutateAsync({
        id: folder.id,
        parent_id: selectedParentId
      })
      setIsMoveModalOpen(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleAddProjects = async () => {
    try {
      // For each selected project, create a project-folder element linking to it
      for (const pId of selectedProjectIds) {
        // Find project name to use as label
        const proj = projectsList.find((p: any) => p.id === pId)
        await createFolder.mutateAsync({
          type: 'PROJECT',
          mcp_project_id: pId,
          parent_id: folder.id,
          label: proj?.name || proj?.title || 'Project'
        })
      }
      setIsAddProjectsModalOpen(false)
      setSelectedProjectIds([])
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <>
      <div className="relative" ref={popoverRef}>
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsPopoverOpen(!isPopoverOpen)
          }}
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-main hover:bg-hover-bg transition-colors"
        >
          <MoreHorizontal size={16} />
        </button>

        {isPopoverOpen && (
          <div
            className="absolute right-0 top-full z-[100] mt-1 w-40 overflow-hidden rounded-lg border border-border-subtle bg-bg-card shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsAddProjectsModalOpen(true)
                setIsPopoverOpen(false)
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-main hover:bg-hover-bg transition-colors"
            >
              <Plus size={14} />
              {t("addProjects")}
            </button>
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
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-text-main hover:bg-hover-bg transition-colors"
            >
              <MoveRight size={14} />
              {t("moveFolder")}
            </button>
            <div className="h-px w-full bg-border-subtle/50 my-1" />
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
          </div>
        )}
      </div>

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
              {t("deleteFolder")}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-text-muted">
              {t("deleteDescription", { name: folder.name })}
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-main hover:bg-hover-bg transition-colors">
                  {tCommon("cancel")}
                </button>
              </Dialog.Close>
              <button
                onClick={handleDelete}
                disabled={deleteFolder.isPending}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleteFolder.isPending ? tNav("deleting") || tCommon("deleting") || "Deleting..." : tCommon("delete")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Folder Modal */}
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
              {t("renameFolder")}
            </Dialog.Title>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="title" className="text-sm font-medium text-text-main">
                  {t("name")}
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-border-subtle bg-bg-main px-3 py-2 text-sm text-text-main outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                  placeholder={t("folderNameInput")}
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
                disabled={updateFolder.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {updateFolder.isPending ? t("saving") : t("saveChanges")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Move Folder Modal */}
      <Dialog.Root open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
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
              {t("moveFolderTitle")}
            </Dialog.Title>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">
                  {t("selectNewParent")}
                </label>
                <select
                  className="w-full rounded-lg border border-border-subtle bg-bg-main px-3 py-2 text-sm text-text-main outline-none focus:border-primary/50 transition-all"
                  value={selectedParentId || ''}
                  onChange={e => setSelectedParentId(e.target.value || null)}
                >
                  <option value="">{t("rootDirectory")}</option>
                  {allFoldersData?.filter((f: ProjectFolder) => f.type?.toUpperCase() === 'FOLDER' && f.id !== folder.id).map((f: ProjectFolder) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-main hover:bg-hover-bg transition-colors">
                  {tCommon("cancel")}
                </button>
              </Dialog.Close>
              <button
                onClick={handleMove}
                disabled={updateFolder.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {updateFolder.isPending ? t("moving") : t("moveFolder")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Add Projects Modal */}
      <Dialog.Root open={isAddProjectsModalOpen} onOpenChange={setIsAddProjectsModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          />
          <Dialog.Content
            className="fixed left-1/2 top-1/2 z-[120] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-subtle bg-bg-card p-6 shadow-2xl focus:outline-none flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Dialog.Title className="text-lg font-semibold text-text-main uppercase">
              {t("addProjectsTitle")}
            </Dialog.Title>
            <div className="mt-4 overflow-y-auto flex-1 pr-2">
              <p className="text-sm text-text-muted mb-3">{t("selectProjectsDescription")}</p>
              <div className="space-y-2">
                {projectsList.map((p: { id: string, name: string, title: string }) => (
                  <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-hover-bg rounded-lg cursor-pointer transition-colors border border-transparent hover:border-border-subtle">
                    <input
                      type="checkbox"
                      checked={selectedProjectIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedProjectIds([...selectedProjectIds, p.id])
                        else setSelectedProjectIds(selectedProjectIds.filter(id => id !== p.id))
                      }}
                      className="rounded text-primary focus:ring-primary w-4 h-4"
                    />
                    <span className="text-sm font-medium text-text-main">{p.name || p.title || t("untitledProject")}</span>
                  </label>
                ))}
                {projectsList.length === 0 && (
                  <p className="text-sm text-text-muted italic">{t("noProjectsFound")}</p>
                )}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border-subtle">
              <Dialog.Close asChild>
                <button className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-main hover:bg-hover-bg transition-colors">
                  {tCommon("cancel")}
                </button>
              </Dialog.Close>
              <button
                onClick={handleAddProjects}
                disabled={createFolder.isPending || selectedProjectIds.length === 0}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {createFolder.isPending ? t("adding") : t("addToFolder")}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
