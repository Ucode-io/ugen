'use client'
import { Link, usePathname, useRouter } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import { LayoutGrid, FolderPlus, Folder, ChevronRight, Plus, Trash2, Edit2, FileIcon } from "lucide-react"
import { useState, useRef, useEffect, useCallback, MouseEvent as ReactMouseEvent } from "react"
import { useProjectFolders, useCreateProjectFolder, useUpdateProjectFolder, useDeleteProjectFolder, useUpdateProjectFoldersOrder, ProjectFolder } from "@/entities/project-folder"
import { useProjectsList } from "@/entities/project"
import {
  DndContext,
  closestCenter,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  useDraggable,
  useDndContext,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useQueryClient } from '@tanstack/react-query'

const FolderEmptyDropZone = ({ folderId }: { folderId: string }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-drop-${folderId}`,
    data: { type: 'folder-dropzone', folderId }
  })
  const tWidgets = useTranslations('widgets.sidebar')

  return (
    <div
      ref={setNodeRef}
      className={`py-1.5 px-2 text-xs text-center border border-dashed rounded-lg transition-colors mx-1 ${isOver ? 'bg-primary/10 border-primary text-primary' : 'border-transparent text-text-muted/50'}`}
    >
      {tWidgets('dropHere')}
    </div>
  )
}

const RootDropZone = () => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'root-dropzone',
    data: { type: 'root-dropzone' }
  })
  const { active: dndActive } = useDndContext()
  const tWidgets = useTranslations('widgets.sidebar')

  if (!dndActive) return null

  return (
    <div
      ref={setNodeRef}
      className={`py-1.5 px-2 text-xs text-center border border-dashed rounded-lg transition-colors mx-1 mt-1 ${
        isOver
          ? 'bg-red-500/10 border-red-500 text-red-500'
          : 'border-border-subtle text-text-muted/50'
      }`}
    >
      {tWidgets('removeFromFolder')}
    </div>
  )
}

const SortableNode = ({
  id,
  item,
  level,
  isCollapsed,
  forceDraggingState = false
}: {
  id: string,
  item: ProjectFolder,
  level: number,
  isCollapsed: boolean,
  forceDraggingState?: boolean
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { item, type: item.type?.toUpperCase() === 'FOLDER' ? 'folder' : 'item' }
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging || forceDraggingState ? 0.3 : 1,
    position: 'relative' as const,
    zIndex: isDragging ? 10 : 1,
  }

  if (item.type?.toUpperCase() === 'FOLDER') {
    return (
      <div ref={setNodeRef} style={style}>
        <FolderNodeContent
          folder={item}
          level={level}
          isCollapsed={isCollapsed}
          attributes={attributes}
          listeners={listeners}
          isDragging={isDragging}
        />
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Link
        href={item.type?.toUpperCase() === 'PROJECT' ? `/projects/${item.mcp_project_id}` : `/chat/${item.chat_id}`}
        className="text-text-muted hover:bg-hover-bg hover:text-text-main flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors"
        title={item.label}
        onClick={(e) => {
          if (isDragging) {
            e.preventDefault()
          }
        }}
      >
        <div className="w-4 h-4 shrink-0 flex items-center justify-center">
          <span className="text-[10px] uppercase font-bold text-text-muted">{item.icon || <FileIcon size={14} />}</span>
        </div>
        <span className="truncate">{item?.project_data?.title}</span>
      </Link>
    </div>
  )
}

const FolderNodeContent = ({ folder, level, isCollapsed, attributes, listeners, isDragging }: any) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(folder.label)
  const [isHovered, setIsHovered] = useState(false)
  const [isCreatingChild, setIsCreatingChild] = useState(false)
  const tNav = useTranslations('Navigation')
  const tWidgets = useTranslations('widgets.sidebar')
  const [newChildName, setNewChildName] = useState(tNav('new_folder'))
  const newChildInputRef = useRef<HTMLInputElement>(null)

  const { setNodeRef: setDropRef, isOver: isDropOver } = useDroppable({
    id: `folder-header-drop-${folder.id}`,
    data: { type: 'folder', item: folder }
  })

  const { active: dndActive } = useDndContext()

  const { data: children } = useProjectFolders(folder.id, undefined, isOpen || isHovered)
  const updateFolder = useUpdateProjectFolder()
  const deleteFolder = useDeleteProjectFolder()
  const createFolder = useCreateProjectFolder()

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
          setNewChildName(tNav('new_folder'))
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
        ref={setDropRef}
        className={`group text-text-muted hover:bg-hover-bg hover:text-text-main flex w-full items-center justify-between rounded-lg transition-colors py-1 pl-1 pr-2 ${isDropOver ? 'bg-primary/10 ring-1 ring-primary/40' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-1.5 overflow-hidden flex-1 cursor-pointer" {...attributes} {...listeners}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              toggleOpen(e)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-text-muted hover:bg-black/5 dark:hover:bg-white/10 hover:text-text-main flex items-center justify-center rounded-md p-0.5 transition-colors shrink-0"
          >
            <ChevronRight
              size={14}
              strokeWidth={2}
              className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
            />
          </button>

          <Link
            href={`/projects?folder_id=${folder.id}`}
            className="flex items-center gap-1.5 flex-1 overflow-hidden"
            onClick={(e) => {
              if (isDragging) {
                e.preventDefault()
              }
            }}
          >
            <Folder size={14} strokeWidth={2} className="shrink-0" />
            {isEditing ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                autoFocus
                onClick={(e) => {
                  e.stopPropagation()
                  e.preventDefault()
                }}
                className="flex-1 bg-transparent outline-none border-b border-primary text-sm min-w-0"
              />
            ) : (
              <span className="flex-1 truncate text-sm select-none">{folder.label}</span>
            )}
          </Link>
        </div>

        {!isCollapsed && isHovered && !isEditing && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); setIsCreatingChild(true); setIsOpen(true); }}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
              title={tWidgets("addChild")}
            >
              <Plus size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
              title={tWidgets("edit")}
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deleteFolder.mutate(folder.id); }}
              className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded"
              title={tWidgets("delete")}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {!isCollapsed && isOpen && (
        <div className="border-border-subtle mt-0.5 ml-3.5 space-y-0.5 border-l py-0.5 pl-1.5">
          <SortableContext items={(children || []).map(c => c.id)} strategy={verticalListSortingStrategy}>
            {(children || []).map((child) => (
              <SortableNode key={child.id} id={child.id} item={child} level={level + 1} isCollapsed={isCollapsed} />
            ))}
          </SortableContext>

          {(children?.length === 0 || !!dndActive) && !isCreatingChild && (
            <FolderEmptyDropZone folderId={folder.id} />
          )}

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

const DraggableProjectLink = ({ project }: { project: { id: string; name: string } }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `recent-${project.id}`,
    data: { type: 'recent-project', projectId: project.id, name: project.name },
  })

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ opacity: isDragging ? 0.4 : 1, cursor: isDragging ? 'grabbing' : 'grab' }}
    >
      <Link
        href={`/projects/${project.id}`}
        className="text-text-muted hover:bg-hover-bg hover:text-text-main flex items-center gap-2 rounded-lg px-2 py-1 text-sm transition-colors"
        title={project.name}
        onClick={(e) => { if (isDragging) e.preventDefault() }}
        draggable={false}
      >
        <FileIcon size={14} className="shrink-0 text-text-muted" />
        <span className="truncate">{project.name}</span>
      </Link>
    </div>
  )
}

interface ProjectsNavProps {
  isCollapsed: boolean;
  isAllProjectsOpen: boolean;
  setIsAllProjectsOpen: (val: boolean) => void;
}

export const ProjectsNav = ({ isCollapsed, isAllProjectsOpen, setIsAllProjectsOpen }: ProjectsNavProps) => {
  const tNav = useTranslations('Navigation')
  const tWidgets = useTranslations('widgets.sidebar')
  const { data: rootFolders } = useProjectFolders(undefined, undefined, !isCollapsed && isAllProjectsOpen)
  const { data: recentProjectsResponse } = useProjectsList(
    { order_by: 'updated_at', order_direction: 'desc', limit: 4 },
    { enabled: !isCollapsed && isAllProjectsOpen }
  )

  const rawRecentData = recentProjectsResponse?.response || recentProjectsResponse?.data || recentProjectsResponse
  const recentProjects: { id: string; name: string }[] = (Array.isArray(rawRecentData) ? rawRecentData : rawRecentData?.projects || [])
    .map((p: any) => ({ id: p.id, name: p.name || p.title || tWidgets('untitledProject') }))

  const createFolder = useCreateProjectFolder()
  const updateFolder = useUpdateProjectFolder()
  const deleteFolder = useDeleteProjectFolder()
  const updateOrder = useUpdateProjectFoldersOrder()
  const queryClient = useQueryClient()

  const [activeItem, setActiveItem] = useState<any>(null)
  const [isCreatingRoot, setIsCreatingRoot] = useState(false)
  const [newRootName, setNewRootName] = useState(tNav('new_folder'))
  const rootInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  // Prioritise pointer-within (folder headers / empty drop zones) over closest-center reordering
  const collisionDetection = useCallback((args: Parameters<typeof closestCenter>[0]) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) return pointerCollisions
    return closestCenter(args)
  }, [])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    if (active.data.current?.type === 'recent-project') {
      setActiveItem({ _recentProject: true, name: active.data.current.name })
      return
    }
    const itemData = active.data.current?.item as ProjectFolder
    if (itemData) {
      setActiveItem(itemData)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveItem(null)
    const { active, over } = event

    if (!over || active.id === over.id) return

    const activeType = active.data.current?.type
    const overType = over.data.current?.type

    // ── Recent project dragged ────────────────────────────────────────────────
    if (activeType === 'recent-project') {
      if (overType === 'folder' || overType === 'folder-dropzone') {
        const targetFolderId = overType === 'folder-dropzone'
          ? over.data.current?.folderId
          : over.data.current?.item?.id
        if (targetFolderId) {
          createFolder.mutate({
            label: active.data.current.name,
            type: 'PROJECT',
            mcp_project_id: active.data.current.projectId,
            parent_id: targetFolderId,
            order_number: 0,
          })
        }
      }
      return
    }

    const activeItemData = active.data.current?.item as ProjectFolder
    if (!activeItemData) return

    // ── PROJECT item dragged ──────────────────────────────────────────────────
    if (activeType === 'item') {
      // Dropped onto a folder header or folder dropzone → move to folder
      if (overType === 'folder' || overType === 'folder-dropzone') {
        const targetFolderId = overType === 'folder-dropzone'
          ? over.data.current?.folderId
          : over.data.current?.item?.id
        if (!targetFolderId) return
        if (activeItemData.parent_id === targetFolderId) return // already there
        try {
          await createFolder.mutateAsync({
            label: activeItemData.label,
            type: 'PROJECT',
            mcp_project_id: activeItemData.mcp_project_id,
            parent_id: targetFolderId,
            order_number: 0,
          })
          await deleteFolder.mutateAsync(activeItemData.id)
        } catch {
          queryClient.invalidateQueries({ queryKey: ['project-folders'] })
        }
        return
      }

      // Dropped onto root drop zone → remove from folder
      if (overType === 'root-dropzone') {
        try {
          await deleteFolder.mutateAsync(activeItemData.id)
        } catch {
          queryClient.invalidateQueries({ queryKey: ['project-folders'] })
        }
        return
      }

      // Dropped onto another item
      const overItemData = over.data.current?.item as ProjectFolder
      if (!overItemData) return

      const sourceParentId = activeItemData.parent_id || null
      const targetParentId = overItemData.parent_id || null

      if (sourceParentId === targetParentId) {
        // Reorder in the same folder
        const list = queryClient.getQueryData<ProjectFolder[]>(['project-folders', sourceParentId || 'root', undefined]) || []
        const oldIndex = list.findIndex(x => x.id === active.id)
        const newIndex = list.findIndex(x => x.id === over.id)
        const newItems = [...list]
        const [removed] = newItems.splice(oldIndex, 1)
        newItems.splice(newIndex, 0, removed)
        queryClient.setQueryData(['project-folders', sourceParentId || 'root', undefined], newItems)
        try {
          await updateOrder.mutateAsync({
            items: newItems.map((item, i) => ({ id: item.id, order_number: i + 1 }))
          })
        } catch {
          queryClient.invalidateQueries({ queryKey: ['project-folders'] })
        }
      } else {
        // Move to a different folder: create new entry + delete old
        try {
          await createFolder.mutateAsync({
            label: activeItemData.label,
            type: 'PROJECT',
            mcp_project_id: activeItemData.mcp_project_id,
            parent_id: targetParentId,
            order_number: 0,
          })
          await deleteFolder.mutateAsync(activeItemData.id)
        } catch {
          queryClient.invalidateQueries({ queryKey: ['project-folders'] })
        }
      }
      return
    }

    // ── FOLDER dragged ────────────────────────────────────────────────────────
    if (activeType === 'folder') {
      // Dropped onto a folder dropzone (empty folder's drop area)
      if (overType === 'folder-dropzone') {
        const targetParentId: string | null = over.data.current?.folderId || null
        if (activeItemData.id === targetParentId) return // can't drop folder into itself
        if (activeItemData.parent_id === targetParentId) return // already there
        try {
          await updateFolder.mutateAsync({ id: activeItemData.id, parent_id: targetParentId })
        } catch {
          queryClient.invalidateQueries({ queryKey: ['project-folders'] })
        }
        return
      }

      // Dropped onto a folder header → move into that folder
      if (overType === 'folder') {
        const targetParentId = over.data.current?.item?.id
        if (activeItemData.id === targetParentId) return // can't drop folder into itself
        if (activeItemData.parent_id === targetParentId) return // already there
        try {
          await updateFolder.mutateAsync({ id: activeItemData.id, parent_id: targetParentId })
        } catch {
          queryClient.invalidateQueries({ queryKey: ['project-folders'] })
        }
        return
      }

      // Dropped onto root drop zone → move folder to root
      if (overType === 'root-dropzone') {
        if (!activeItemData.parent_id) return // already at root
        try {
          await updateFolder.mutateAsync({ id: activeItemData.id, parent_id: null })
        } catch {
          queryClient.invalidateQueries({ queryKey: ['project-folders'] })
        }
        return
      }

      // Dropped onto another item (reorder or cross-list move)
      const overItemData = over.data.current?.item as ProjectFolder
      if (!overItemData) return

      const sourceParentId = activeItemData.parent_id || null
      const targetParentId = overItemData.parent_id || null

      if (sourceParentId === targetParentId) {
        // Reorder in the same list
        const list = queryClient.getQueryData<ProjectFolder[]>(['project-folders', sourceParentId || 'root', undefined]) || []
        const oldIndex = list.findIndex(x => x.id === active.id)
        const newIndex = list.findIndex(x => x.id === over.id)
        const newItems = [...list]
        const [removed] = newItems.splice(oldIndex, 1)
        newItems.splice(newIndex, 0, removed)
        queryClient.setQueryData(['project-folders', sourceParentId || 'root', undefined], newItems)
        try {
          await updateOrder.mutateAsync({
            items: newItems.map((item, i) => ({ id: item.id, order_number: i + 1 }))
          })
        } catch {
          queryClient.invalidateQueries({ queryKey: ['project-folders'] })
        }
      } else {
        // Moving to a different list
        try {
          queryClient.setQueryData(['project-folders', sourceParentId || 'root', undefined], (old: ProjectFolder[] | undefined) => {
            if (!old) return old
            return old.filter(x => x.id !== activeItemData.id)
          })
          const updatedItem = { ...activeItemData, parent_id: targetParentId || undefined }
          queryClient.setQueryData(['project-folders', targetParentId || 'root', undefined], (old: ProjectFolder[] | undefined) => {
            if (!old) return [updatedItem]
            const newItems = [...old]
            const overIndex = newItems.findIndex(x => x.id === overItemData.id)
            if (overIndex >= 0) {
              newItems.splice(overIndex, 0, updatedItem)
            } else {
              newItems.push(updatedItem)
            }
            return newItems
          })
          await updateFolder.mutateAsync({ id: activeItemData.id, parent_id: targetParentId })
        } catch {
          queryClient.invalidateQueries({ queryKey: ['project-folders'] })
        }
      }
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
          setNewRootName(tNav('new_folder'))
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

  const foldersData = rootFolders || []

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div>
        {!isCollapsed && (
          <h3 className="text-text-muted/70 mb-2 px-3 text-xs font-semibold tracking-wide uppercase">
            {tNav("projects")}
          </h3>
        )}
        <nav className="space-y-0.5">
          <div>
            <div
              className={`text-text-muted hover:bg-hover-bg hover:text-text-main flex w-full items-center rounded-lg transition-colors ${isCollapsed ? "justify-center p-2" : "py-1.5 pl-1.5 pr-3"}`}
              title={isCollapsed ? tNav("all_projects") : undefined}
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
                  <span className="flex-1 truncate text-left">{tNav("all_projects")}</span>
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
                  <span className="truncate">{tNav("new_folder")}</span>
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

                <SortableContext items={foldersData.map((c: any) => c.id)} strategy={verticalListSortingStrategy}>
                  {foldersData.map((folder: ProjectFolder) => (
                    <SortableNode key={folder.id} id={folder.id} item={folder} level={0} isCollapsed={isCollapsed} />
                  ))}
                </SortableContext>

                {recentProjects.map(project => (
                  <DraggableProjectLink key={project.id} project={project} />
                ))}

                <RootDropZone />
              </div>
            )}
          </div>
        </nav>
      </div>

      <DragOverlay>
        {activeItem ? (
          <div className="opacity-90 cursor-grabbing bg-bg-main shadow-xl rounded-lg p-2 border border-border-default z-50">
            {activeItem._recentProject ? (
              <div className="flex items-center gap-2">
                <FileIcon size={16} className="shrink-0 text-text-muted" />
                <span className="text-sm font-medium">{activeItem.name}</span>
              </div>
            ) : activeItem.type?.toUpperCase() === 'FOLDER' ? (
              <div className="flex items-center gap-2">
                <Folder size={16} className="shrink-0 text-text-muted" />
                <span className="text-sm font-medium">{activeItem.label}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FileIcon size={16} className="shrink-0 text-text-muted" />
                <span className="text-sm font-medium">{activeItem.label || activeItem.name}</span>
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
