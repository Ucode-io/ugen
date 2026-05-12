'use client'
import { useState } from "react"
import { Link } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import { ChevronDown, File } from "lucide-react"
import { useProjectsList } from "@/entities/project";
import { useAuthStore } from "@/entities/session";

export const RecentsNav = () => {
  const tNav = useTranslations('Navigation')
  const tWidgets = useTranslations('widgets.sidebar')
  const isUgen = useAuthStore((s) => s.project?.is_ugen ?? false)
  const [isOpen, setIsOpen] = useState(false)

  const { data: projectsResponse, isLoading } = useProjectsList(
    {
      order_by: "updated_at",
      order_direction: "desc",
      limit: 4,
    },
    { enabled: isUgen }
  );

  const rawData =
    projectsResponse?.response || projectsResponse?.data || projectsResponse;
  const projectsList = Array.isArray(rawData)
    ? rawData
    : rawData?.projects || [];

  const recents = projectsList.map((p: any) => ({
    id: p.id,
    name: p.name || p.title || tWidgets("untitledProject"),
  }));

  if (!isUgen) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="text-text-muted/70 hover:text-text-main mb-1 flex w-full items-center justify-between px-3 py-1 text-xs font-semibold tracking-wide uppercase transition-colors"
      >
        <span>{tNav("recents")}</span>
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={`transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`}
        />
      </button>

      {isOpen && (
        <nav className="space-y-0.5">
          {isLoading ? (
            <div className="text-text-muted/50 px-3 py-2 text-xs">
              {tWidgets("loading")}
            </div>
          ) : recents.length === 0 ? (
            <div className="text-text-muted/50 px-3 py-2 text-xs">
              {tWidgets("noRecentProjects")}
            </div>
          ) : (
            recents.map((project: { id: string | number; name: string }) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}` as any}
                className="text-text-muted hover:bg-hover-bg hover:text-text-main flex items-center gap-3 rounded-lg px-3 py-1.5 transition-colors"
                title={project.name}
              >
                <File size={16} strokeWidth={2} className="shrink-0" />
                <span className="truncate">{project.name}</span>
              </Link>
            ))
          )}
        </nav>
      )}
    </div>
  );
}
