'use client'
import { useState, useEffect } from "react"
import { WorkspaceChat } from "@/widgets/workspace-chat"
import { PanelLeftClose, PanelRightClose, ChevronLeft, CodeXml, Globe } from "lucide-react"
import { ProjectCodeViewer } from "@/widgets/project-workspace/ui/project-code-viewer"
import { ProjectPreviewViewer } from "@/widgets/project-workspace/ui/project-preview-viewer"
import { useRouter } from "@/shared/lib/i18n/navigation"
import { api } from "@/shared/api"

export const ProjectWorkspaceClient = ({ projectId }: { projectId: string }) => {
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview')
  const [projectTitle, setProjectTitle] = useState('Loading...')
  const router = useRouter()

  useEffect(() => {
    api.get(`/v1/ai-chat/project/${projectId}`)
      .then(res => {
        if (res.data?.title) {
          setProjectTitle(res.data.title)
        } else if (res.data?.data?.title) {
          setProjectTitle(res.data.data.title)
        } else {
          setProjectTitle('Workspace Project')
        }
      })
      .catch((err) => {
        console.error("Failed to load project title", err)
        setProjectTitle('Workspace Project')
      })
  }, [projectId])

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-bg-main relative">
      {/* Header */}
      <header className="h-[48px] border-b border-border-subtle bg-bg-card flex items-center justify-between px-4 shrink-0 z-10 transition-all duration-300">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsChatCollapsed(!isChatCollapsed)}
            className="text-text-muted hover:text-text-main hover:bg-hover-bg p-1 rounded-lg transition-colors flex items-center justify-center shrink-0"
            title={isChatCollapsed ? "Open AI Chat" : "Collapse AI Chat"}
          >
            {isChatCollapsed ? <PanelRightClose size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <div className="bg-border-subtle w-[1px] h-4 mx-1" />
          <button
            onClick={() => router.push('/projects')}
            className="text-text-muted hover:text-text-main hover:bg-hover-bg p-1 rounded-lg transition-colors flex items-center justify-center shrink-0"
            title="Back to Projects"
          >
            <ChevronLeft size={16} />
          </button>
          <h1 className="text-[15px] font-medium text-text-main truncate max-w-[300px] ml-1">
            {projectTitle}
          </h1>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 bg-bg-main p-1 rounded-lg border border-border-subtle">
            <button
              onClick={() => setActiveTab('preview')}
              className={`p-1 rounded-md transition-colors flex items-center justify-center shrink-0 group relative ${activeTab === 'preview'
                ? 'bg-bg-card shadow-sm text-text-main'
                : 'text-text-muted hover:text-text-main hover:bg-hover-bg'
                }`}
            >
              <Globe size={16} />
              <div className="absolute top-10 whitespace-nowrap bg-bg-tooltip text-text-tooltip text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Preview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`p-1 rounded-md transition-colors flex items-center justify-center shrink-0 group relative ${activeTab === 'code'
                ? 'bg-bg-card shadow-sm text-text-main'
                : 'text-text-muted hover:text-text-main hover:bg-hover-bg'
                }`}
            >
              <CodeXml size={16} />
              <div className="absolute top-10 whitespace-nowrap bg-bg-tooltip text-text-tooltip text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Code
              </div>
            </button>
          </div>

          <div className="bg-border-subtle w-[1px] h-4 mx-2" />

          <button className="bg-primary text-white hover:bg-primary-hover px-4 py-1.5 rounded-lg text-[13px] font-medium transition-colors">
            Publish
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <WorkspaceChat projectId={projectId} isCollapsed={isChatCollapsed} />

        {/* Content Area */}
        {activeTab === 'code' ? <ProjectCodeViewer /> : <ProjectPreviewViewer />}
      </div>
    </div>
  )
}
