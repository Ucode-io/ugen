import { useTranslations } from "next-intl"
import { Search, LayoutGrid, List, Plus } from "lucide-react"
import { Link } from "@/shared/lib/i18n/navigation"

interface ProjectsToolbarProps {
  viewType: 'grid' | 'list'
  setViewType: (val: 'grid' | 'list') => void
  searchQuery: string
  setSearchQuery: (val: string) => void
  isUgen?: boolean
}

export const ProjectsToolbar = ({
  viewType,
  setViewType,
  searchQuery,
  setSearchQuery,
  isUgen = false
}: ProjectsToolbarProps) => {
  const t = useTranslations('widgets.projects')

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="flex w-full flex-wrap items-center gap-3">
        <div className="flex w-full sm:w-64 md:w-80 items-center gap-2 mr-auto rounded-xl border border-border-subtle bg-input-bg px-3 py-1.5 transition-all focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
          <Search className="text-text-muted shrink-0" size={18} />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-text-main outline-none placeholder:text-text-muted"
          />
        </div>

        <div className="flex items-center rounded-xl border border-border-subtle bg-bg-main p-1 shrink-0">
          <button
            onClick={() => setViewType("grid")}
            className={`rounded-lg transition-colors p-2 ${viewType === 'grid' ? 'bg-input-bg text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}
            title={t("gridView")}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewType("list")}
            className={`rounded-lg transition-colors p-2 ${viewType === 'list' ? 'bg-input-bg text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'}`}
            title={t("listView")}
          >
            <List size={14} />
          </button>
        </div>

        {isUgen && (
          <Link
            href="/?focus=prompt"
            className="border-border-subtle bg-bg-main text-text-muted hover:bg-hover-bg hover:text-text-main flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            {t("createNewProject")}
          </Link>
        )}
      </div>
    </div>
  )
}
