'use client'
import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  UserCircle,
  ShieldAlert,
  Contact2,
  Files,
  Database,
  BarChart2,
  Box,
  Globe,
  KeyRound,
  Layers2,
  History,
  Code
} from "lucide-react"
import { UsersManagement } from './users-management'
import { MediaGallery } from '@/widgets/media-gallery/ui/media-gallery'
import { DatabaseStudio, LogsView } from '@/widgets/database-studio'
import { CodeView } from '@/widgets/project-workspace'
import { ClientTypeManagement } from '@/widgets/client-type-management'
import { useMemo } from 'react'
import { useMenus } from '@/entities/menu/lib/use-menus'
import { MenuItem } from '@/entities/menu/model/types'
import { DashboardSidebar, NavigationItem } from './dashboard-sidebar'
import { RoleList } from '@/widgets/role-manage'
import { PermissionManage } from '@/widgets/permission-manage'
import { useClientTypes } from '@/entities/client-type'
import { AppSettingsPage } from '@/widgets/app-settings'
import { ResourcesPage } from './resources-page'
import { ApiKeysPage } from './api-keys-page'
import { AnalyticsDashboard } from "@/widgets/analytics"

type DashboardSection = string

interface EmptySectionPlaceholderProps {
  icon: React.ElementType
  label: string
}

const EmptySectionPlaceholder = ({ icon: Icon, label }: EmptySectionPlaceholderProps) => (
  <div className="ai-card flex min-h-[400px] items-center justify-center border-dashed p-6">
    <div className="space-y-3 text-center">
      <div className="bg-primary/5 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
        <Icon size={24} className="text-primary/40" />
      </div>
      <h3 className="text-text-main text-lg font-medium">{label}</h3>
      <p className="text-text-muted mx-auto max-w-[300px] text-sm">
        This section is under development. Here you will find management tools for your project {label.toLowerCase()}.
      </p>
    </div>
  </div>
)

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
  const { data: clientTypes = [] } = useClientTypes(projectId)

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
    {
      id: 'permissions_group',
      icon: ShieldCheck,
      label: 'Permissions',
      isGroup: true,
      items: clientTypes?.map((ct: any) => ({
        id: `perm_${ct.guid}`,
        label: ct.name,
      })) || []
    },
    { id: 'resources', icon: Box, label: 'Resources' },
    { id: 'api_keys', icon: KeyRound, label: 'Api' },
    { id: 'code', icon: Code, label: 'Code' },
    { id: 'database_studio', icon: Database, label: 'Database' },
    { id: 'activity_logs', icon: History, label: 'Activity logs' },
    { id: 'analytics', icon: BarChart2, label: 'Analytics' },
  ], [fileMenus, clientTypes])

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

  const renderActiveSection = () => {
    if (activeSection === 'overview') {
      return <AppSettingsPage />
    }

    if (activeSection === "users") {
      return (
        <UsersManagement projectId={projectId} projectInfo={projectInfo} />
      );
    }

    if (activeSection === "roles") {
      return <RoleList projectId={projectId ?? ''} />;
    }

    if (activeSection === "client_types") {
      return <ClientTypeManagement projectId={projectId ?? ''} />;
    }

    if (activeSection === "database_studio") {
      return <DatabaseStudio projectId={projectId ?? ''} />;
    }

    if (activeSection === "activity_logs") {
      return <LogsView />;
    }

    if (activeSection === 'resources') {
      return <ResourcesPage projectId={projectId ?? ''} />
    }

    if (activeSection === "analytics") {
      return <AnalyticsDashboard />;
    }

    if (activeSection.startsWith("perm_")) {
      const clientId = activeSection.split("perm_")[1];
      return <PermissionManage projectId={projectId ?? ''} clientTypeId={clientId} />;
    }



    if (activeSection === 'api_keys') {
      return <ApiKeysPage projectId={projectId ?? ''} />
    }

    if (activeSection === 'code') {
      return <CodeView projectId={projectId ?? ''} />
    }

    const filesGroup = navigationItems.find((n) => n.id === "files");
    const activeFileItem = filesGroup?.items?.find(
      (i: any) => i.id === activeSection,
    );

    if (activeFileItem) {
      return (
        <div className="ai-card flex min-h-[400px] items-center justify-center p-6">
          <MediaGallery
            activeMenuId={activeSection}
            folderPath={(activeFileItem as any).path || "media"}
          />
        </div>
      );
    }

    return <EmptySectionPlaceholder icon={activeItem?.icon ?? LayoutDashboard} label={activeItem?.label ?? ''} />
  };

  return (
    <div className="bg-bg-main relative flex h-full flex-1 overflow-hidden">
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
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl p-8">
          <div className="grid gap-6">{renderActiveSection()}</div>
        </div>
      </main>
    </div>
  );
}
