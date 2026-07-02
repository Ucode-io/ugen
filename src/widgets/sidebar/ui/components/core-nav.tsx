'use client'
import { Link } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import { Home, Search, LayoutGrid, MessagesSquare, LayoutTemplate, Package, Tag } from "lucide-react"
import { usePathname } from "@/shared/lib/i18n/navigation"
import { useAuthStore } from "@/entities/session"
import { useShallow } from "zustand/react/shallow"
import { SUPER_ADMIN_PROJECT_ID, SUPER_ADMIN_USER_ID } from "@/shared/config"

interface CoreNavProps {
  onSearchClick: () => void;
  isUgen?: boolean;
}

export const CoreNav = ({ onSearchClick, isUgen = true }: CoreNavProps) => {
  const t = useTranslations('Navigation')
  const pathname = usePathname()
  const { activeCompanyId, project, user } = useAuthStore(
    useShallow((s) => ({
      activeCompanyId: s.activeCompanyId,
      project: s.project,
      user: s.user,
    })),
  )
  const isSuperAdmin =
    project?.project_id === SUPER_ADMIN_PROJECT_ID && user?.id === SUPER_ADMIN_USER_ID

  const projectsHref = activeCompanyId ? `/projects?company_id=${activeCompanyId}` : "/projects"

  const allItems = [
    { key: "search", href: "/search", icon: Search, action: "search" as const },
    { key: "home", href: "/", icon: Home, action: "link" as const, requiresUgen: true },
    { key: "projects", href: projectsHref, icon: LayoutGrid, action: "link" as const },
    { key: "chats", href: "/chats", icon: MessagesSquare, action: "link" as const, requiresUgen: true },
    { key: "templates", href: "/dashboard/templates", icon: LayoutTemplate, action: "link" as const },
    { key: "all_projects", href: "/dashboard/all-projects", icon: LayoutGrid, action: "link" as const, requiresSuperAdmin: true },
    { key: "token_packs", href: "/dashboard/token-packs", icon: Package, action: "link" as const, requiresSuperAdmin: true },
    { key: "template_pricing", href: "/dashboard/template-pricing", icon: Tag, action: "link" as const, requiresSuperAdmin: true },
  ]

  const items = allItems.filter(item => {
    if (item.requiresSuperAdmin) return isSuperAdmin
    return !item.requiresUgen || isUgen
  })

  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon
        if (item.action === "search") {
          return (
            <button
              key={item.key}
              onClick={onSearchClick}
              className="text-text-muted hover:bg-hover-bg hover:text-text-main flex w-full items-center gap-3 rounded-lg px-3 py-1.5 transition-colors"
            >
              <Icon size={16} strokeWidth={2} />
              <span>{t(item.key)}</span>
            </button>
          );
        }

        // Match exact path or path with query string for projects
        const isActive = item.key === "projects"
          ? pathname === "/projects"
          : pathname === item.href.split("?")[0];

        return (
          <Link
            key={item.key}
            href={item.href as any}
            className={`flex items-center gap-3 rounded-lg px-3 py-1.5 transition-colors ${isActive
              ? "bg-bg-card text-text-main font-semibold"
              : "text-text-muted hover:bg-hover-bg hover:text-text-main"
              }`}
          >
            <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
            <span>{t(item.key)}</span>
          </Link>
        );
      })}
    </nav>
  )
}
