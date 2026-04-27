'use client'
import { Link } from "@/shared/lib/i18n/navigation"
import { useTranslations } from "next-intl"
import { File } from "lucide-react"
import { useProjectsList } from "@/entities/project";
import { useAuthStore } from "@/entities/session";

interface RecentsNavProps {
  isCollapsed: boolean;
}

export const RecentsNav = ({ isCollapsed }: RecentsNavProps) => {
  const tNav = useTranslations('Navigation')
  const tWidgets = useTranslations('widgets.sidebar')
  const isUgen = useAuthStore((s) => s.project?.is_ugen ?? false)
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
      {!isCollapsed && (
        <h3 className="text-text-muted/70 mb-2 px-3 text-xs font-semibold tracking-wide uppercase">
          {tNav("recents")}
        </h3>
      )}
      <nav className="space-y-0.5">
        {isLoading ? (
          <div className="text-text-muted/50 px-3 py-2 text-xs">
            {!isCollapsed && tWidgets("loading")}
          </div>
        ) : recents.length === 0 ? (
          <div className="text-text-muted/50 px-3 py-2 text-xs">
            {!isCollapsed && tWidgets("noRecentProjects")}
          </div>
        ) : (
          recents.map((project: { id: string | number; name: string }) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className={`text-text-muted hover:bg-hover-bg hover:text-text-main flex items-center rounded-lg transition-colors ${isCollapsed ? "justify-center p-2" : "gap-3 px-3 py-1.5"}`}
              title={isCollapsed ? project.name : undefined}
            >
              <File size={16} strokeWidth={2} className="shrink-0" />
              {!isCollapsed && <span className="truncate">{project.name}</span>}
            </Link>
          ))
        )}
      </nav>
    </div>
  );
}
