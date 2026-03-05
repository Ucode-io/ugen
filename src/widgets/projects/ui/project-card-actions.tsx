"use client"
import { useState, useRef, useEffect } from "react"
import { MoreHorizontal, Trash2, Edit, MoveRight, FolderMinus } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"
import { useDeleteProject, useUpdateProject } from "@/entities/project"
import { useProjectFolders, useCreateProjectFolder, useDeleteProjectFolder, ProjectFolder } from "@/entities/project-folder"
import { useQueryClient } from "@tanstack/react-query"

interface ProjectCardActionsProps {
  project: {
    id: string
    name: string
    description?: string
  },
  folderItemId?: string
}

export const ProjectCardActions = ({ project, folderItemId }: ProjectCardActionsProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false)
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)

  const popoverRef = useRef<HTMLDivElement>(null)

  const queryClient = useQueryClient()

  const deleteProject = useDeleteProject()
  const updateProject = useUpdateProject()

  const { data: allFoldersData } = useProjectFolders()
  const createFolder = useCreateProjectFolder()
  const deleteFolder = useDeleteProjectFolder()

  const [title, setTitle] = useState(project.name)
  const [description, setDescription] = useState(project.description || "")

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
      await deleteProject.mutateAsync(project.id)
      setIsDeleteModalOpen(false)
    } catch (e) {
      console.error(e)
    }
  }

  const handleUpdate = async () => {
    console.log(project)
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

  return (
    <>
      <div className="relative" ref={popoverRef} >
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
            className="absolute right-0 top-full z-[100] mt-1 w-38 overflow-hidden rounded-lg border border-border-subtle bg-bg-card shadow-lg"
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
              Edit
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
              Move to folder
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
                Remove from folder
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
              Delete
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
              Delete Project
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-text-muted">
              Are you sure you want to delete <span className="font-bold text-text-main">{project.name}</span>? This action cannot be undone.
            </Dialog.Description>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-main hover:bg-hover-bg transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleDelete}
                disabled={deleteProject.isPending}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleteProject.isPending ? "Deleting..." : "Delete"}
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
              Edit Project
            </Dialog.Title>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="title" className="text-sm font-medium text-text-main">
                  Title
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-border-subtle bg-bg-main px-3 py-2 text-sm text-text-main outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                  placeholder="Project name"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="description" className="text-sm font-medium text-text-main">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full min-h-[100px] rounded-lg border border-border-subtle bg-bg-main px-3 py-2 text-sm text-text-main outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all resize-none"
                  placeholder="Brief description of your project"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-main hover:bg-hover-bg transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleUpdate}
                disabled={updateProject.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {updateProject.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Move Project Modal */}
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
              Move Project to Folder
            </Dialog.Title>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-main">
                  Select folder
                </label>
                <select
                  className="w-full rounded-lg border border-border-subtle bg-bg-main px-3 py-2 text-sm text-text-main outline-none focus:border-primary/50 transition-all"
                  value={selectedParentId || ''}
                  onChange={e => setSelectedParentId(e.target.value || null)}
                >
                  <option value="">Root directory</option>
                  {allFoldersData?.filter((f: ProjectFolder) => f.type?.toUpperCase() === 'FOLDER').map((f: ProjectFolder) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Dialog.Close asChild>
                <button className="rounded-lg border border-border-subtle px-4 py-2 text-sm font-medium text-text-main hover:bg-hover-bg transition-colors">
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleMove}
                disabled={createFolder.isPending}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {createFolder.isPending ? "Moving..." : "Move"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
