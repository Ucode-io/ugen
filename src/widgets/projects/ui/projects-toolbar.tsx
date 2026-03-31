import { useTranslations } from "next-intl"
import { Search, SquareDashed, LayoutGrid, List } from "lucide-react"

interface ProjectsToolbarProps {
  canSelectProject: boolean
  setCanSelectProject: (val: boolean) => void
  viewType: 'grid' | 'list'
  setViewType: (val: 'grid' | 'list') => void
  searchQuery: string
  setSearchQuery: (val: string) => void
}

export const ProjectsToolbar = ({
  canSelectProject,
  setCanSelectProject,
  viewType,
  setViewType,
  searchQuery,
  setSearchQuery
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

        <button
          onClick={() => setCanSelectProject(!canSelectProject)}
          className={`flex items-center justify-center rounded-xl border border-border-subtle p-2 transition-colors ${canSelectProject ? 'bg-bg-secondary text-bg-main' : 'bg-input-bg text-text-muted hover:bg-hover-bg hover:text-text-main'}`}
          title={t("toggleSelection")}
        >
          <SquareDashed size={16} />
        </button>

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
      </div>
    </div>
  )
}
