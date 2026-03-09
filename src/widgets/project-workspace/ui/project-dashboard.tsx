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
  Contact2
} from "lucide-react"
import { UsersManagement } from './users-management'

type DashboardSection =
  | 'overview'
  | 'users'
  | 'roles'
  | 'client_types'
  | 'integrations'
  | 'logs'
  | 'security'

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
  const [isUsersExpanded, setIsUsersExpanded] = useState(true)

  const navigationItems = [
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
    { id: 'integrations', icon: Puzzle, label: 'Integrations' },
    { id: 'logs', icon: ScrollText, label: 'Logs' },
    { id: 'security', icon: ShieldCheck, label: 'Security' },
  ]

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

  const activeItem = findActiveItem(navigationItems, activeSection)

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-bg-main relative">
      {/* Sidebar */}
      <aside
        className={`bg-bg-card border-r border-border-subtle flex flex-col transition-all duration-300 shrink-0 ${isSidebarCollapsed ? 'w-0 border-r-0' : 'w-[240px]'
          }`}
      >
        <div
          className={`flex flex-col p-3 gap-1 h-full w-full overflow-hidden transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
        >
          {navigationItems.map((item) => {
            if (item.isGroup) {
              const isSubItemActive = item.items.some((sub: any) => sub.id === activeSection)

              return (
                <div key={item.id} className="flex flex-col gap-1">
                  <button
                    onClick={() => setIsUsersExpanded(!isUsersExpanded)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 group ${isSubItemActive && !isUsersExpanded
                      ? 'bg-primary/10 text-primary'
                      : 'text-text-muted hover:text-text-main hover:bg-hover-bg'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon size={18} className={`${isSubItemActive ? 'text-primary' : 'text-text-muted group-hover:text-text-main'} transition-colors`} />
                      {item.label}
                    </div>
                    {isUsersExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </button>

                  <div
                    className={`flex flex-col gap-1 overflow-hidden transition-all duration-300 ${isUsersExpanded ? 'max-h-[200px] mt-1' : 'max-h-0'
                      }`}
                  >
                    {item.items.map((sub: any) => {
                      const SubIcon = sub.icon
                      const isActive = activeSection === sub.id

                      return (
                        <button
                          key={sub.id}
                          onClick={() => setActiveSection(sub.id as DashboardSection)}
                          className={`flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 group ${isActive
                            ? 'bg-primary/5 text-primary shadow-sm'
                            : 'text-text-muted hover:text-text-main hover:bg-hover-bg'
                            }`}
                        >
                          <SubIcon size={16} className={`${isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-main'} transition-colors`} />
                          {sub.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            }

            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as DashboardSection)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-200 group ${isActive
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-text-muted hover:text-text-main hover:bg-hover-bg'
                  }`}
              >
                <Icon size={18} className={`${isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-main'} transition-colors`} />
                {item.label}
              </button>
            )
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="p-8 max-w-5xl mx-auto w-full">
          <header className="mb-8 flex items-start justify-between">
            <div className="flex flex-col">
              <h2 className="text-2xl font-bold text-text-main capitalize">
                {activeItem?.label || activeSection.replace('_', ' ')}
              </h2>
              <p className="text-text-muted mt-1">
                Manage your project {activeItem?.label.toLowerCase() || activeSection.replace('_', ' ')} settings and data.
              </p>
            </div>
          </header>

          <div className="grid gap-6">
            {activeSection === 'users' ? (
              <UsersManagement projectId={projectId} projectInfo={projectInfo} />
            ) : (
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
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
