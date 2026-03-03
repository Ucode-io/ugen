'use client'
import { Link, usePathname } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import { LayoutGrid, FolderPlus, Folder, ChevronRight, Plus, Trash2, Edit2 } from "lucide-react"
import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, DragEvent } from "react"
import { useProjectFolders, useCreateProjectFolder, useUpdateProjectFolder, useDeleteProjectFolder, useUpdateProjectFoldersOrder, ProjectFolder } from "@/entities/project-folder"

const FolderItem = ({ folder, level, isCollapsed }: { folder: ProjectFolder, level: number, isCollapsed: boolean }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(folder.label)
  const [isHovered, setIsHovered] = useState(false)

  const [isCreatingChild, setIsCreatingChild] = useState(false)
  const [newChildName, setNewChildName] = useState('New folder')
  const newChildInputRef = useRef<HTMLInputElement>(null)

  const { data: children } = useProjectFolders(folder.id, undefined, isOpen)

  const updateFolder = useUpdateProjectFolder()
  const deleteFolder = useDeleteProjectFolder()
  const createFolder = useCreateProjectFolder()
  const updateOrder = useUpdateProjectFoldersOrder()

  const [localChildren, setLocalChildren] = useState<ProjectFolder[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    setLocalChildren(children || [])
  }, [children])

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation()
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedIndex === null || draggedIndex === index) return

    const newItems = [...localChildren]
    const [removed] = newItems.splice(draggedIndex, 1)
    newItems.splice(index, 0, removed)
    setLocalChildren(newItems)
    setDraggedIndex(null)

    const requestItems = newItems.map((item, i) => ({
      id: item.id,
      order_number: i + 1
    }))

    try {
      await updateOrder.mutateAsync({ items: requestItems })
    } catch {
      setLocalChildren(children || [])
    }
  }

  const handleSaveEdit = () => {
    if (editName.trim() && editName !== folder.label) {
      updateFolder.mutate({ id: folder.id, label: editName })
    }
    setIsEditing(false)
  }

  const handleCreateChild = () => {
    if (newChildName.trim()) {
      createFolder.mutate({
        label: newChildName,
        type: 'FOLDER',
        parent_id: folder.id,
        order_number: (children?.length || 0) + 1
      }, {
        onSuccess: () => {
          setIsCreatingChild(false)
          setNewChildName('New folder')
          setIsOpen(true)
        }
      })
    } else {
      setIsCreatingChild(false)
    }
  }

  const toggleOpen = (e: ReactMouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    if (isCreatingChild && newChildInputRef.current) {
      newChildInputRef.current.focus()
      newChildInputRef.current.select()
    }
  }, [isCreatingChild])

  return (
    <div className="w-full">
      <div
        className="group text-text-muted hover:bg-hover-bg hover:text-text-main flex w-full items-center justify-between rounded-lg transition-colors py-1 pl-1 pr-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 cursor-pointer" onClick={toggleOpen}>
          <button
            type="button"
            className="text-text-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-main flex items-center justify-center rounded-md p-0.5 transition-colors shrink-0"
          >
            <ChevronRight
              size={14}
              strokeWidth={2}
              className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
            />
          </button>

          <Folder size={14} strokeWidth={2} className="shrink-0" />

          {isEditing ? (
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={handleSaveEdit}
              onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-transparent outline-none border-b border-primary text-sm min-w-0"
            />
          ) : (
            <span className="flex-1 truncate text-sm select-none">{folder.label}</span>
          )}
        </div>

        {!isCollapsed && isHovered && !isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setIsCreatingChild(true); setIsOpen(true); }}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
              title="Add child"
            >
              <Plus size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
              title="Edit"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteFolder.mutate(folder.id); }}
              className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {!isCollapsed && isOpen && (
        <div className="border-border-subtle mt-0.5 ml-3.5 space-y-0.5 border-l py-0.5 pl-1.5">
          {localChildren.map((child, index) => (
            <div
              key={child.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={() => setDraggedIndex(null)}
              className={draggedIndex === index ? 'opacity-50' : ''}
            >
              {child.type?.toUpperCase() === 'FOLDER' ? (
                <FolderItem folder={child} level={level + 1} isCollapsed={isCollapsed} />
              ) : (
                <Link
                  href={child.type?.toUpperCase() === 'PROJECT' ? `/projects/${child.mcp_project_id}` : `/chat/${child.chat_id}`}
                  className="text-text-muted hover:bg-hover-bg hover:text-text-main flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors"
                  title={child.label}
                >
                  <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                    <span className="text-[10px]">{child.icon || (child.type?.toUpperCase() === 'PROJECT' ? 'P' : 'C')}</span>
                  </div>
                  <span className="truncate">{child.label}</span>
                </Link>
              )}
            </div>
          ))}

          {isCreatingChild && (
            <div className="flex items-center gap-2 px-2 py-1">
              <Folder size={14} className="text-text-muted shrink-0" />
              <input
                ref={newChildInputRef}
                value={newChildName}
                onChange={e => setNewChildName(e.target.value)}
                onBlur={handleCreateChild}
                onKeyDown={e => e.key === 'Enter' && handleCreateChild()}
                className="flex-1 bg-transparent outline-none text-sm text-text-main border-b border-primary min-w-0"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface ProjectsNavProps {
  isCollapsed: boolean;
  isAllProjectsOpen: boolean;
  setIsAllProjectsOpen: (val: boolean) => void;
}

export const ProjectsNav = ({ isCollapsed, isAllProjectsOpen, setIsAllProjectsOpen }: ProjectsNavProps) => {
  const t = useTranslations('Navigation')
  const { data: rootFolders } = useProjectFolders(undefined, undefined, !isCollapsed && isAllProjectsOpen)
  const createFolder = useCreateProjectFolder()
  const updateOrder = useUpdateProjectFoldersOrder()

  const [isCreatingRoot, setIsCreatingRoot] = useState(false)
  const [newRootName, setNewRootName] = useState('New folder')
  const rootInputRef = useRef<HTMLInputElement>(null)

  const [localRootFolders, setLocalRootFolders] = useState<ProjectFolder[]>([])
  const [draggedRootIndex, setDraggedRootIndex] = useState<number | null>(null)

  useEffect(() => {
    setLocalRootFolders(rootFolders?.filter((f: ProjectFolder) => f.type?.toUpperCase() === 'FOLDER') || [])
  }, [rootFolders])

  const handleRootDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation()
    setDraggedRootIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleRootDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleRootDrop = async (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedRootIndex === null || draggedRootIndex === index) return

    const newItems = [...localRootFolders]
    const [removed] = newItems.splice(draggedRootIndex, 1)
    newItems.splice(index, 0, removed)
    setLocalRootFolders(newItems)
    setDraggedRootIndex(null)

    const requestItems = newItems.map((item, i) => ({
      id: item.id,
      order_number: i + 1
    }))

    try {
      await updateOrder.mutateAsync({ items: requestItems })
    } catch {
      setLocalRootFolders(rootFolders?.filter((f: ProjectFolder) => f.type?.toUpperCase() === 'FOLDER') || [])
    }
  }

  const handleCreateRoot = () => {
    if (newRootName.trim()) {
      createFolder.mutate({
        label: newRootName,
        type: 'FOLDER',
        parent_id: null,
        order_number: (rootFolders?.length || 0) + 1
      }, {
        onSuccess: () => {
          setIsCreatingRoot(false)
          setNewRootName('New folder')
          if (!isAllProjectsOpen) setIsAllProjectsOpen(true)
        }
      })
    } else {
      setIsCreatingRoot(false)
    }
  }

  useEffect(() => {
    if (isCreatingRoot && rootInputRef.current) {
      rootInputRef.current.focus()
      rootInputRef.current.select()
    }
  }, [isCreatingRoot])

  return (
    <div>
      {!isCollapsed && (
        <h3 className="text-text-muted/70 mb-2 px-3 text-xs font-semibold tracking-wide uppercase">
          {t("projects")}
        </h3>
      )}
      <nav className="space-y-0.5">
        <div>
          <div
            className={`text-text-muted hover:bg-hover-bg hover:text-text-main flex w-full items-center rounded-lg transition-colors ${isCollapsed ? "justify-center p-2" : "py-1.5 pl-1.5 pr-3"}`}
            title={isCollapsed ? t("all_projects") : undefined}
          >
            {!isCollapsed && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsAllProjectsOpen(!isAllProjectsOpen);
                }}
                className="text-text-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-main mr-1 flex items-center justify-center rounded-md p-0.5 transition-colors shrink-0"
              >
                <ChevronRight
                  size={16}
                  strokeWidth={2}
                  className={`transition-transform duration-200 ${isAllProjectsOpen ? "rotate-90" : ""}`}
                />
              </button>
            )}

            <Link
              href="/projects"
              className="flex flex-1 items-center gap-2 overflow-hidden"
            >
              <LayoutGrid size={16} strokeWidth={2} className="shrink-0" />
              {!isCollapsed && (
                <span className="flex-1 truncate text-left">{t("all_projects")}</span>
              )}
            </Link>
          </div>

          {!isCollapsed && isAllProjectsOpen && (
            <div className="border-border-subtle mt-0.5 ml-5 space-y-0.5 border-l py-1 pl-2">
              <button
                onClick={() => setIsCreatingRoot(true)}
                className="text-text-muted hover:bg-hover-bg hover:text-text-main flex w-full items-center gap-3 rounded-lg px-2 py-1.5 transition-colors text-sm"
              >
                <FolderPlus size={16} strokeWidth={2} className="shrink-0" />
                <span className="truncate">{t("new_folder")}</span>
              </button>

              {isCreatingRoot && (
                <div className="flex items-center gap-3 px-2 py-1.5">
                  <Folder size={16} className="text-text-muted shrink-0" />
                  <input
                    ref={rootInputRef}
                    value={newRootName}
                    onChange={e => setNewRootName(e.target.value)}
                    onBlur={handleCreateRoot}
                    onKeyDown={e => e.key === 'Enter' && handleCreateRoot()}
                    className="flex-1 bg-transparent outline-none text-sm border-b border-primary text-text-main min-w-0"
                  />
                </div>
              )}

              {localRootFolders.map((folder: ProjectFolder, index: number) => (
                <div
                  key={folder.id}
                  draggable
                  onDragStart={(e) => handleRootDragStart(e, index)}
                  onDragOver={(e) => handleRootDragOver(e, index)}
                  onDrop={(e) => handleRootDrop(e, index)}
                  onDragEnd={() => setDraggedRootIndex(null)}
                  className={draggedRootIndex === index ? 'opacity-50' : ''}
                >
                  <FolderItem folder={folder} level={0} isCollapsed={isCollapsed} />
                </div>
              ))}
            </div>
          )}
        </div>
      </nav>
    </div>
  )
}
