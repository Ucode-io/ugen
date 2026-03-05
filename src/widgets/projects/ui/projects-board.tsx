"use client"
import { useState, useRef, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useProjectsList } from "@/entities/project"
import { useProjectFolders, useProjectFolder, useCreateProjectFolder, ProjectFolder } from "@/entities/project-folder"
import { ProjectsToolbar } from "./projects-toolbar"
import { ProjectsGrid } from "./projects-grid"
import { ProjectsList } from "./projects-list"
import { FolderCard } from "./folder-card"
import { useDebounce } from "@/shared/hooks/use-debounce"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { ChevronRight, MoreHorizontal, FolderPlus } from "lucide-react"
import * as Dialog from "@radix-ui/react-dialog"

export const ProjectsBoard = () => {
  const t = useTranslations('Navigation')
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [canSelectProject, setCanSelectProject] = useState(false)
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  // Current folder
  const folderId = searchParams.get('folder_id') || undefined

  // Fetch folders and projects
  const { data: currentFolder } = useProjectFolder(folderId || '')
  const { data: folderItems, isLoading: isFoldersLoading } = useProjectFolders(folderId, undefined, !!folderId)
  const { data: projectsResponse, isLoading: isProjectsLoading } = useProjectsList(
    debouncedSearchQuery ? { title: debouncedSearchQuery } : undefined
  )

  const createFolder = useCreateProjectFolder()
  const [isCreatePopoverOpen, setIsCreatePopoverOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const popoverRef = useRef<HTMLDivElement>(null)

  const rawData = projectsResponse?.response || projectsResponse?.data || projectsResponse
  const projectsList = Array.isArray(rawData) ? rawData : (rawData?.projects || [])

  const isSearching = debouncedSearchQuery.length > 0

  const foldersDisplay: any[] = []
  let projectsDisplay: any[] = []

  if (isSearching) {
    projectsDisplay = projectsList.map((p: any) => ({
      ...p,
      isFolder: false,
      mcp_project_id: p.id,
      name: p.name || p.title || "Untitled Project",
      description: p.description || "",
      editedAt: p.updated_at ? `Edited: ${new Date(p.updated_at).toLocaleDateString()}` : "Recently edited",
      createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString() : "Unknown",
      author: {
        name: p.user?.name || p.owner || "Unknown Author",
        initials: (p.user?.name || p.owner || "U").substring(0, 2).toUpperCase()
      },
      image: p.image || p.thumbnail || null,
      rawProject: p
    }))
  } else {
    if (folderItems) {
      folderItems.forEach((f: ProjectFolder) => {
        if (f.type?.toUpperCase() === 'FOLDER') {
          foldersDisplay.push({
            id: f.id,
            name: f.label,
            rawFolder: f
          })
        } else if (f.type?.toUpperCase() === 'PROJECT' && folderId) {
          const p = projectsList.find((proj: any) => proj.id === f.mcp_project_id)
          projectsDisplay.push({
            id: f.id, // folder item id
            isFolder: false,
            mcp_project_id: f.mcp_project_id,
            folderItemId: f.id,
            name: p ? (p.name || p.title) : f.label,
            description: p?.description || (f.attributes?.description as string) || "",
            editedAt: p?.updated_at
              ? `Edited: ${new Date(p.updated_at).toLocaleDateString()}`
              : f.updated_at ? `Edited: ${new Date(f.updated_at).toLocaleDateString()}` : "Recently edited",
            createdAt: p?.created_at
              ? new Date(p.created_at).toLocaleDateString()
              : f.created_at ? new Date(f.created_at).toLocaleDateString() : "Unknown",
            author: {
              name: p?.user?.name || p?.owner || (f.attributes?.author_name as string) || "Unknown Author",
              initials: (p?.user?.name || p?.owner || (f.attributes?.author_name as string) || "U").substring(0, 2).toUpperCase()
            },
            image: p?.image || p?.thumbnail || (f.attributes?.image as string) || null,
            rawProject: p || {
              id: f.mcp_project_id || f.id,
              title: f.label,
              name: f.label,
              description: f.attributes?.description || "",
              image: f.attributes?.image || null
            }
          })
        }
      })
    }

    if (!folderId) {
      projectsList.forEach((p: any) => {
        projectsDisplay.push({
          id: p.id,
          isFolder: false,
          mcp_project_id: p.id,
          folderItemId: undefined,
          name: p.name || p.title || "Untitled Project",
          description: p.description || "",
          editedAt: p.updated_at ? `Edited: ${new Date(p.updated_at).toLocaleDateString()}` : "Recently edited",
          createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString() : "Unknown",
          author: {
            name: p.user?.name || p.owner || "Unknown Author",
            initials: (p.user?.name || p.owner || "U").substring(0, 2).toUpperCase()
          },
          image: p.image || p.thumbnail || null,
          rawProject: p
        })
      })
    }
  }

  const isLoading = isFoldersLoading || isProjectsLoading

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsCreatePopoverOpen(false)
      }
    }
    if (isCreatePopoverOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isCreatePopoverOpen])

  const handleCreateFolderSave = async () => {
    if (newFolderName.trim()) {
      try {
        await createFolder.mutateAsync({
          label: newFolderName.trim(),
          type: 'FOLDER',
          parent_id: folderId || null,
          order_number: foldersDisplay.length + 1
        })
        setIsCreateModalOpen(false)
        setNewFolderName('')
      } catch (e) {
        console.error(e)
      }
    }
  }

  return (
    <div className="flex h-full w-full flex-col p-6 bg-bg-card shadow-sm rounded-2xl">
      <div className="flex items-center gap-4 mb-6 relative" ref={popoverRef}>
        <h1 className="text-2xl font-semibold text-text-main flex items-center gap-2">
          {folderId ? (
            <>
              <button onClick={() => router.push(pathname)} className="hover:text-primary transition-colors">
                {t("projects")}
              </button>
              <ChevronRight size={20} className="text-text-muted" />
              <span>{currentFolder?.label || "Loading..."}</span>
            </>
          ) : (
            t("projects")
          )}
        </h1>

        <button
          onClick={() => setIsCreatePopoverOpen(!isCreatePopoverOpen)}
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors ml-1"
        >
          <MoreHorizontal size={20} />
        </button>

        {isCreatePopoverOpen && (
          <div className="absolute left-[130px] top-full z-[100] mt-1 w-48 overflow-hidden rounded-lg border border-border-subtle bg-bg-card shadow-lg">
            <button
              onClick={() => {
                setIsCreatePopoverOpen(false)
                setIsCreateModalOpen(true)
              }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-text-main hover:bg-hover-bg transition-colors"
            >
              <FolderPlus size={16} />
              Create new folder
            </button>
          </div>
        )}
      </div>

      {foldersDisplay.length > 0 && (
        <div className="flex flex-wrap gap-4 mb-6">
          {foldersDisplay.map(folder => (
            <FolderCard key={folder.id} folder={folder} />
          ))}
        </div>
      )}

      <ProjectsToolbar
        canSelectProject={canSelectProject}
        setCanSelectProject={setCanSelectProject}
        viewType={viewType}
        setViewType={setViewType}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="flex-1 mt-6">
        {isLoading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-bg-sidebar border-t-primary"></div>
          </div>
        ) : viewType === 'grid' ? (
          <ProjectsGrid projects={projectsDisplay} />
        ) : (
          <ProjectsList projects={projectsDisplay} />
        )}
      </div>

      {/* Create Folder Modal */}
      <Dialog.Root open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[120] w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-subtle bg-bg-card p-6 shadow-2xl focus:outline-none">
            <Dialog.Title className="text-lg font-semibold text-text-main uppercase">
              Create New Folder
            </Dialog.Title>
            <div className="mt-4 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="folderName" className="text-sm font-medium text-text-main">Folder Name</label>
                <input
                  id="folderName"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full rounded-lg border border-border-subtle bg-bg-main px-3 py-2 text-sm text-text-main outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all"
                  placeholder="e.g. My Folder"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleCreateFolderSave()}
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
                onClick={handleCreateFolderSave}
                disabled={createFolder.isPending || !newFolderName.trim()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {createFolder.isPending ? "Creating..." : "Create"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  )
}
