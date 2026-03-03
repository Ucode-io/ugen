import { Folder } from "lucide-react"
import { FolderCardActions } from "./folder-card-actions"
import { Link } from "@/shared/lib/i18n/navigation"

export const FolderCard = ({ folder }: { folder: any }) => {
  return (
    <div className="group relative flex w-[200px] h-[58px] items-center rounded-2xl border border-border-subtle bg-bg-sidebar px-4 hover:border-text-muted transition-colors cursor-pointer shrink-0">
      <Link href={`/projects?folder_id=${folder.id}`} className="flex items-center gap-3 flex-1 h-full min-w-0 pr-6">
        <Folder size={20} className="text-text-muted shrink-0" />
        <span className="truncate text-[15px] font-medium text-text-main">{folder.name}</span>
      </Link>

      <div className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center h-full">
        <FolderCardActions folder={folder} />
      </div>
    </div>
  )
}
