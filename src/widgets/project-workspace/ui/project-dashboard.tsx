'use client'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Puzzle,
  ScrollText,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  UserCircle,
  ShieldAlert,
  Contact2,
  Files
} from "lucide-react"
import { UsersManagement } from './users-management'
import { MediaGallery } from '@/widgets/media-gallery/ui/media-gallery'
import { ClientTypeManagement } from '@/widgets/client-type-management'
import { useMemo } from 'react'
import { useMenus } from '@/entities/menu/lib/use-menus'
import { MenuItem } from '@/entities/menu/model/types'
import { DashboardSidebar, NavigationItem } from './dashboard-sidebar'

type DashboardSection = string

interface ProjectDashboardProps {
  isSidebarCollapsed: boolean
  setIsSidebarCollapsed: (collapsed: boolean) => void
  projectInfo?: any
  projectId?: string
}

export const ProjectDashboard = ({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  projectInfo,
  projectId
}: ProjectDashboardProps) => {
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview')

  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  const { data: fileMenus, isLoading: isMenusLoading } = useMenus('8a6f913a-e3d4-4b73-9fc0-c942f343d0b9')

  const navigationItems: NavigationItem[] = useMemo(() => [
    { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
    {
      id: 'users_group',
      icon: Users,
      label: 'Users Management',
      isGroup: true,
      items: [
        { id: 'users', icon: UserCircle, label: 'Users' },
        { id: 'roles', icon: ShieldAlert, label: 'Roles' },
        { id: 'client_types', icon: Contact2, label: 'Client Types' },
      ]
    },
    {
      id: 'files',
      icon: Files,
      label: 'Files',
      isGroup: true,
      items: fileMenus?.map((menu: MenuItem) => ({
        id: menu.id,
        label: menu.label,
        path: menu.attributes.path
      })) || [{ id: 'media', label: 'Media', path: 'media' }]
    },
    { id: 'integrations', icon: Puzzle, label: 'Integrations' },
    { id: 'logs', icon: ScrollText, label: 'Logs' },
    { id: 'security', icon: ShieldCheck, label: 'Security' },
  ], [fileMenus])

  const findActiveItem = (items: any[], activeId: string): any => {
    for (const item of items) {
      if (item.isGroup) {
        const subItem = item.items.find((i: any) => i.id === activeId)
        if (subItem) return subItem
      } else if (item.id === activeId) {
        return item
      }
    }
    return null
  }

  const handleGroupClick = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    )
  }

  const activeItem = findActiveItem(navigationItems, activeSection)

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-bg-main relative">
      {/* Sidebar Component */}
      <DashboardSidebar
        items={navigationItems}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        isCollapsed={isSidebarCollapsed}
        expandedGroups={expandedGroups}
        onToggleGroup={handleGroupClick}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="p-8 max-w-5xl mx-auto w-full">
          {/* <header className="mb-8 flex items-start justify-between">
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold text-text-main capitalize">
                {activeItem?.label || activeSection.replace('_', ' ')}
              </h2>
              <p className="text-text-muted mt-1">
                Manage your project {activeItem?.label.toLowerCase() || activeSection.replace('_', ' ')} settings and data.
              </p>
            </div>
          </header> */}

          <div className="grid gap-6">
            {activeSection === 'users' ? (
              <UsersManagement projectId={projectId} projectInfo={projectInfo} />
            ) : activeSection === 'client_types' ? (
              <ClientTypeManagement />
            ) : (() => {
              const filesGroup = navigationItems.find(n => n.id === 'files')
              const activeFileItem = filesGroup?.items?.find((i: any) => i.id === activeSection)

              if (activeFileItem) {
                return (
                  <MediaGallery
                    activeMenuId={activeSection}
                    folderPath={(activeFileItem as any).path || 'media'}
                  />
                )
              }

              return (
                <div className="ai-card p-6 min-h-[400px] flex items-center justify-center border-dashed">
                  <div className="text-center space-y-3">
                    {(() => {
                      const Icon = activeItem?.icon
                      return (
                        <>
                          <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center mx-auto">
                            {Icon && <Icon size={24} className="text-primary/40" />}
                          </div>
                          <h3 className="text-lg font-medium text-text-main">{activeItem?.label} Content</h3>
                        </>
                      )
                    })()}
                    <p className="text-text-muted text-sm max-w-[300px] mx-auto">
                      This section is under development. Here you will find management tools for your project {activeItem?.label.toLowerCase()}.
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      </main>
    </div>
  )
}
