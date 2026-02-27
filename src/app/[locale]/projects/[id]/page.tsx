import { useTranslations } from "next-intl"
import { WorkspaceChat } from "@/widgets/workspace-chat"

interface ProjectPageProps {
  params: Promise<{
    locale: string
    id: string
  }>
}

export default async function ProjectSinglePage({ params }: ProjectPageProps) {
  const { id } = await params

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bg-main relative">
      {/* Left sidebar: AI Chat (now manages its own width and collapse state) */}
      <WorkspaceChat projectId={id} />
      {/* Right Canvas/Project Workspace */}
      <div className="flex h-full flex-1 flex-col p-6 overflow-y-auto">
        <h1 className="text-3xl font-semibold text-text-main mb-6">
          Project Workspace (ID: {id})
        </h1>
        <div className="flex-1 rounded-2xl bg-bg-card border border-border-subtle p-6 shadow-sm">
          <p className="text-text-muted">
            Here will be the canvas or project specific content.
            This page is intentionally separated from the main dashboard sidebar.
          </p>
        </div>
      </div>
    </div>
  )
}
