'use client'
import { Link } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import { Home, Search, Layers, BarChart2 } from "lucide-react"
import { usePathname } from "@/shared/lib/i18n/navigation"

interface CoreNavProps {
  isCollapsed: boolean;
  onSearchClick: () => void;
}

export const CoreNav = ({ isCollapsed, onSearchClick }: CoreNavProps) => {
  const t = useTranslations('Navigation')
  const pathname = usePathname()

  const items = [
    { key: "home", href: "/", icon: Home },
    { key: "search", href: "/search", icon: Search },
    { key: "templates", href: "/dashboard/templates", icon: Layers },
    // Adding Analytics to Sidebar core nav
    { key: "analytics", href: "/dashboard/analytics", icon: BarChart2 },
  ]

  return (
    <nav className="space-y-0.5">
      {items.map((item) => {
        if (item.key === "search") {
          return (
            <button
              key={item.key}
              onClick={onSearchClick}
              className={`flex w-full items-center rounded-lg transition-colors ${isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} text-text-muted hover:bg-hover-bg hover:text-text-main`}
              title={isCollapsed ? t(item.key) : undefined}
            >
              <item.icon size={16} strokeWidth={2} />
              {!isCollapsed && <span>{t(item.key)}</span>}
            </button>
          );
        }

        const isActive = pathname === item.href;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`flex items-center rounded-lg transition-colors ${isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"} ${isActive
              ? "bg-hover-bg text-text-main font-semibold"
              : "text-text-muted hover:bg-hover-bg hover:text-text-main"
              } `}
            title={isCollapsed ? t(item.key) : undefined}
          >
            <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
            {!isCollapsed && <span>{t(item.key)}</span>}
          </Link>
        );
      })}
    </nav>
  )
}
