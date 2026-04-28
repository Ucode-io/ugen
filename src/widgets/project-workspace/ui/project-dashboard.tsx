'use client'
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  UserCircle,
  ShieldAlert,
  Contact2,
  Files,
  Globe,
  KeyRound,
  Layers2,
  History,
  Code,
  Lock,
  Database,
  BarChart2,
  Box,
  Braces
} from "lucide-react"
import { UsersManagement } from './users-management'
import { MediaGallery } from '@/widgets/media-gallery/ui/media-gallery'
import { DatabaseStudio, LogsView } from '@/widgets/database-studio'
import { CodeView } from '@/widgets/project-workspace'
import { CodeEditorTarget } from '@/entities/session'
import { ClientTypeManagement } from '@/widgets/client-type-management'

import { useMenus } from '@/entities/menu/lib/use-menus'
import { MenuItem } from '@/entities/menu/model/types'
import { DashboardSidebar, NavigationItem } from './dashboard-sidebar'
import { RoleList } from '@/widgets/role-manage'
import { PermissionManage } from '@/widgets/permission-manage'
import { useClientTypes } from '@/entities/client-type'
import { AppSettingsPage } from '@/widgets/app-settings'
import { ResourcesPage } from './resources-page'
import { ApiKeysPage } from './api-keys-page'
import { SecretsPage } from './secrets-page'
import { ApiIntegrationsPage } from './api-integrations-page'
import { AnalyticsDashboard } from "@/widgets/analytics"
import { CustomEndpointsPage } from './custom-endpoints-page'
import { cn } from '@/shared/lib/utils/cn'

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
  onEditCode?: (target: CodeEditorTarget) => void
  isChatCollapsed?: boolean
}

export const ProjectDashboard = ({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  projectInfo,
  projectId,
  onEditCode,
  isChatCollapsed = false,
}: ProjectDashboardProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const paramsSection = searchParams.get('section');

  const activeSection = (paramsSection as DashboardSection) || 'overview'

  const setActiveSection = useCallback((section: DashboardSection) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('section', section)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, pathname, router])

  const [expandedGroups, setExpandedGroups] = useState<string[]>([])

  const { data: fileMenus, isLoading: isMenusLoading } = useMenus('8a6f913a-e3d4-4b73-9fc0-c942f343d0b9')
  const { data: clientTypes = [] } = useClientTypes(projectId)

  const navigationItems: NavigationItem[] = useMemo(() => [
    { id: 'overview', icon: LayoutDashboard, label: 'Project Settings', category: 'General' },
    { id: 'users', icon: Users, label: 'Users', category: 'General' },
    { id: 'permissions', icon: ShieldCheck, label: 'Permissions', category: 'General' },
    { id: 'files', icon: Files, label: 'Files', category: 'General' },
    { id: 'secrets', icon: Lock, label: 'Secrets', category: 'General' },
    { id: 'resources', icon: Layers2, label: 'Integrations', category: 'General' },
    // { id: 'api_integrations', icon: Layers2, label: 'Integrations', category: 'General' },
    { id: 'api_custom_endpoints', icon: KeyRound, label: 'API', category: 'Development' },
    { id: 'functions', icon: Braces, label: 'Code', category: 'Development' },
    // { id: 'microfrontend', icon: Code, label: 'Microfrontend', category: 'Development' },
    { id: 'database_studio', icon: Database, label: 'Database', category: 'Development' },
    { id: 'logs', icon: History, label: 'Logs', category: 'Monitoring' },
    { id: 'analytics', icon: BarChart2, label: 'Analytics', category: 'Monitoring' },
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

    if (activeSection === "logs") {
      return <LogsView />;
    }

    if (activeSection === 'resources') {
      return <ResourcesPage projectId={projectId ?? ''} />
    }

    if (activeSection === "analytics") {
      return <AnalyticsDashboard />;
    }

    if (activeSection === "permissions") {
      return <PermissionManage projectId={projectId ?? ''} />;
    }



    if (activeSection === 'api_keys') {
      return <ApiKeysPage projectId={projectId ?? ''} />
    }

    if (activeSection === 'secrets') {
      return <SecretsPage projectId={projectId ?? ''} />
    }

    if (activeSection === 'api_integrations') {
      return <ApiIntegrationsPage projectId={projectId ?? ''} />
    }

    if (activeSection === 'api_custom_endpoints') {
      return <CustomEndpointsPage projectId={projectId ?? ''} />
    }

    if (activeSection === "functions") {
      return <CodeView projectId={projectId ?? ""} onEditCode={onEditCode} />;
    }

    if (activeSection === "microfrontend") {
      return <CodeView projectId={projectId ?? ""} activeTab="microfrontend" onEditCode={onEditCode} />;
    }

    if (activeSection === "files") {
      return (
        <div className="flex h-full w-full flex-col overflow-hidden">
          <MediaGallery
            activeMenuId="files"
            folderPath="media"
            folders={fileMenus}
          />
        </div>
      );
    }

    return <EmptySectionPlaceholder icon={activeItem?.icon ?? LayoutDashboard} label={activeItem?.label ?? ''} />
  };

  return (
    <div className={cn(
      "flex-1 flex justify-center items-start h-full overflow-hidden transition-all duration-300",
      "pr-4 pb-2",
      isChatCollapsed ? "pl-4" : "pl-0"
    )}>
      <div
        className="flex flex-col w-full h-full overflow-hidden border border-border-subtle shadow-md transition-all duration-300"
        style={{ borderRadius: '12px' }}
      >
        {/* Dashboard header */}
        <div className="h-10 shrink-0 flex items-center px-3 border-b border-border-subtle bg-bg-card gap-2">
          <div className="flex items-center gap-1.5">
            {activeItem?.icon && <activeItem.icon size={13} className="text-text-muted" />}
            <span className="text-[13px] font-medium text-text-main">{activeItem?.label ?? 'Dashboard'}</span>
          </div>
        </div>

        {/* Content */}
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
            <div className={cn("mx-auto w-full", !['database_studio', 'api_integrations'].includes(activeSection) ? "p-8" : "h-full")}>
              <div className={cn("grid gap-6", !['database_studio', 'api_integrations'].includes(activeSection) ? '' : 'h-full')}>{renderActiveSection()}</div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
