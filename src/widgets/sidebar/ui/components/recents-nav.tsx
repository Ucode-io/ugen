'use client'
import { Link } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import { File } from "lucide-react"

interface RecentsNavProps {
  isCollapsed: boolean;
}

export const RecentsNav = ({ isCollapsed }: RecentsNavProps) => {
  const t = useTranslations('Navigation')

  return (
    <div>
      {!isCollapsed && (
        <h3 className="text-text-muted/70 mb-2 px-3 text-xs font-semibold tracking-wide">
          {t("recents")}
        </h3>
      )}
      <nav className="space-y-0.5">
        <Link
          href="/recent/1"
          className={`text-text-muted hover:bg-hover-bg hover:text-text-main flex items-center rounded-lg transition-colors ${isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"}`}
          title={isCollapsed ? t("simple_site_creator") : undefined}
        >
          <File size={16} strokeWidth={2} />
          {!isCollapsed && (
            <span className="truncate">{t("simple_site_creator")}</span>
          )}
        </Link>
        <Link
          href="/recent/2"
          className={`text-text-muted hover:bg-hover-bg hover:text-text-main flex items-center rounded-lg transition-colors ${isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"}`}
          title={isCollapsed ? t("remix_ai_video") : undefined}
        >
          <File size={16} strokeWidth={2} />
          {!isCollapsed && (
            <span className="truncate">{t("remix_ai_video")}</span>
          )}
        </Link>
        <Link
          href="/recent/3"
          className={`text-text-muted hover:bg-hover-bg hover:text-text-main flex items-center rounded-lg transition-colors ${isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"}`}
          title={isCollapsed ? t("heartfelt_creations") : undefined}
        >
          <File size={16} strokeWidth={2} />
          {!isCollapsed && (
            <span className="truncate">{t("heartfelt_creations")}</span>
          )}
        </Link>
      </nav>
    </div>
  )
}
