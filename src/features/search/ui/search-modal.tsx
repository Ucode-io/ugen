'use client'
import * as Dialog from '@radix-ui/react-dialog'
import { Search, X, Folder, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useProjectsList } from "@/entities/project"
import { useAuthStore } from "@/entities/session"
import { useDebounce } from "@/shared/hooks/useDebounce"
import { useRouter } from "@/shared/lib/i18n/navigation"

interface SearchModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export const SearchModal = ({ isOpen, onOpenChange }: SearchModalProps) => {
  const t = useTranslations('features.search')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 500)
  const router = useRouter()
  const isUgen = useAuthStore((s) => s.project?.is_ugen ?? false)

  // Clear search on open/close
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  // Fetch projects from backend. When searchQuery is empty, we get recent projects.
  const { data: projectsResponse, isLoading } = useProjectsList(
    isOpen ? {
      title: debouncedSearchQuery || undefined,
      order_by: "updated_at",
      order_direction: "desc",
      limit: 10,
    } : {} as any,
    { enabled: isOpen && isUgen }
  )

  const rawData = projectsResponse?.response || projectsResponse?.data || projectsResponse
  const projectsList = Array.isArray(rawData) ? rawData : (rawData?.projects || [])

  const formattedProjects = projectsList.map((p: { id: string, name: string, title: string, updated_at: string, project_image: string, image: string, thumbnail: string }) => {
    const image = p.project_image || p.image || p.thumbnail || null
    return {
      id: p.id,
      title: p.name || p.title || t('untitledProject'),
      time: p.updated_at ? new Date(p.updated_at).toLocaleDateString() : t('recently'),
      image,
    }
  })

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`)
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />
        <Dialog.Content
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-[700px] translate-x-[-50%] translate-y-[-50%] bg-bg-card border border-border-subtle rounded-xl shadow-2xl overflow-hidden focus:outline-none"
        >
          <Dialog.Title className="sr-only">{t('title')}</Dialog.Title>
          <Dialog.Description className="sr-only">{t('description')}</Dialog.Description>

          {/* Header - Search Input */}
          <div className="flex items-center px-4 py-3 border-b border-border-subtle">
            <Search className="text-text-muted mr-3" size={24} />
            <input
              type="text"
              placeholder={t('placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-xl text-text-main outline-none placeholder:text-text-muted"
              autoFocus
            />
            <Dialog.Close asChild>
              <button className="text-text-muted hover:text-text-main transition-colors p-1 rounded-md hover:bg-hover-bg ml-2">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {/* Body - Results */}
          <div className="p-2 max-h-[50vh] overflow-y-auto">
            <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-text-muted uppercase">
              {searchQuery ? t('searchResults') : t('recentProjects')}
            </div>

            {isLoading && (
              <div className="flex justify-center items-center p-8 text-text-muted">
                <Loader2 className="animate-spin" size={24} />
              </div>
            )}

            {!isLoading && formattedProjects.length === 0 && (
              <div className="text-center p-8 text-text-muted text-sm">
                {t('noProjects')}
              </div>
            )}

            {!isLoading && formattedProjects.length > 0 && (
              <div className="space-y-1">
                {formattedProjects.map((project: { id: string, title: string, time: string, image: string | null }) => (
                  <div
                    key={project.id}
                    onClick={() => handleProjectClick(project.id)}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-hover-bg cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-[84px] shrink-0 rounded-md overflow-hidden bg-bg-sidebar flex items-center justify-center border border-border-subtle">
                        {project.image ? (
                          <img
                            src={project.image}
                            alt={project.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Folder size={20} className="text-text-muted" />
                        )}
                      </div>

                      <div>
                        <h4 className="text-[15px] font-semibold text-text-main transition-colors">
                          {project.title}
                        </h4>
                      </div>
                    </div>

                    <div className="text-xs text-text-muted font-medium whitespace-nowrap hidden sm:block pr-2">
                      {project.time}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
