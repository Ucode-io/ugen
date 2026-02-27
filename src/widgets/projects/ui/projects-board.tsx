"use client"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { useProjectsList } from "@/entities/project"
import { ProjectsToolbar } from "./projects-toolbar"
import { ProjectsGrid } from "./projects-grid"
import { ProjectsList } from "./projects-list"
import { useDebounce } from "@/shared/hooks/use-debounce"

export const ProjectsBoard = () => {
  const t = useTranslations('Navigation')
  const [canSelectProject, setCanSelectProject] = useState(false)
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid')
  const [searchQuery, setSearchQuery] = useState('')

  const debouncedSearchQuery = useDebounce(searchQuery, 500)

  const { data: projectsResponse, isLoading, isError } = useProjectsList({ title: debouncedSearchQuery })

  // Locate the actual projects array from the backend response
  const rawData = projectsResponse?.response || projectsResponse?.data || projectsResponse
  const projectsList = Array.isArray(rawData) ? rawData : (rawData?.projects || [])

  const formattedProjects = projectsList.map((p: any) => ({
    id: p.id,
    name: p.name || p.title || "Untitled Project",
    editedAt: p.updated_at ? `Edited: ${new Date(p.updated_at).toLocaleDateString()}` : "Recently edited",
    createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString() : "Unknown",
    author: {
      name: p.user?.name || p.owner || "Unknown Author",
      initials: (p.user?.name || p.owner || "U").substring(0, 2).toUpperCase()
    },
    image: p.image || p.thumbnail || null
  }))

  return (
    <div className="flex h-full w-full flex-col p-6 bg-bg-card shadow-sm rounded-2xl">
      <h1 className="text-2xl font-semibold text-text-main mb-6">{t("projects")}</h1>

      <ProjectsToolbar
        canSelectProject={canSelectProject}
        setCanSelectProject={setCanSelectProject}
        viewType={viewType}
        setViewType={setViewType}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <div className="flex-1 mt-6">
        {isLoading ? (
          <div className="flex h-64 w-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-bg-sidebar border-t-primary"></div>
          </div>
        ) : isError ? (
          <div className="flex h-64 w-full items-center justify-center text-text-muted">
            Failed to load projects. Please try again later.
          </div>
        ) : viewType === 'grid' ? (
          <ProjectsGrid projects={formattedProjects} />
        ) : (
          <ProjectsList projects={formattedProjects} />
        )}
      </div>
    </div>
  )
}
