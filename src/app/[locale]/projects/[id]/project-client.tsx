'use client'
import { useState, useEffect } from "react"
import { WorkspaceChat } from "@/widgets/workspace-chat"
import { PanelLeftClose, PanelRightClose, ChevronLeft, CodeXml, Globe, Loader2, Play } from "lucide-react"
import { ProjectCodeViewer } from "@/widgets/project-workspace/ui/project-code-viewer"
import { ProjectPreviewViewer } from "@/widgets/project-workspace/ui/project-preview-viewer"
import { useRouter } from "@/shared/lib/i18n/navigation"
import { api } from "@/shared/api"
import { useTranslations } from "next-intl"
import { useAuthStore } from '@/entities/session'

import { useFilesStore, IFile } from "@/entities/project/model/files-store"

import { ProjectHeader } from "@/widgets/project-workspace/ui/project-header"
import { ProjectDashboard } from "@/widgets/project-workspace/ui/project-dashboard"
import { EmptyProjectView } from "@/widgets/project-workspace/ui/empty-project-view"
import { ErrorBoundary } from "@/shared/ui/error-boundary"

const getLanguageByPath = (path: string) => {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'json':
      return 'json';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    default:
      return 'javascript';
  }
};

export const ProjectWorkspaceClient = ({ projectId }: { projectId: string }) => {
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [isDashboardSidebarCollapsed, setIsDashboardSidebarCollapsed] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'code' | 'preview'>('preview')
  const [projectTitle, setProjectTitle] = useState('Loading...')
  const [isLoading, setIsLoading] = useState(true)
  const [projectInfo, setProjectInfo] = useState<any>(null)
  const { files, updatedFiles, setFiles, clearWorkspace } = useFilesStore()
  const setApiKey = useAuthStore(state => state.setApiKey)
  const setUcodeProjectId = useAuthStore(state => state.setUcodeProjectId)
  const setActiveProjectTab = useAuthStore(state => state.setActiveProjectTab)
  const hasNoFiles = files.length === 0;
  const t = useTranslations('features.project')

  const handleSaveChanges = () => {
    if (updatedFiles.length > 0) {
      api.put(`/v1/mcp_project/${projectId}`, {
        project_files: updatedFiles
      })
    }
  }

  useEffect(() => {
    setIsLoading(true);
    // Fetch project details and files
    api.get(`/v1/mcp_project/${projectId}`)
      .then(res => {
        const projectData = res.data?.data;
        if (!projectData) {
          return;
        }

        // Save API key for dashboard requests
        if (projectData.api_key) {
          setApiKey(projectData.api_key)
        }

        if (projectData.ucode_project_id) {
          setUcodeProjectId(projectData.ucode_project_id)
        }

        if (projectData.title) {
          setProjectTitle(projectData.title);
        }

        if (projectData.project_files && projectData.project_files.length > 0) {
          const mappedFiles: IFile[] = projectData.project_files.map((file: any) => ({
            path: file.path,
            content: file.content,
            language: getLanguageByPath(file.path)
          }));
          setFiles(mappedFiles);
        }
      })
      .catch((err) => {
        console.error("Failed to load project details", err);
        setProjectTitle('Workspace Project');
      })
      .finally(() => {
        setIsLoading(false);
      })

    // Fetch additional company project info
    api.get(`/v1/company-project/${projectId}`)
      .then(res => {
        const info = res.data?.data;
        if (info) {
          setProjectInfo(info);
        }
      })
      .catch((err) => {
        console.error("Failed to load company project info", err);
      });

    return () => {
      clearWorkspace();
      setApiKey(null)   // clear api key when leaving project workspace
      setActiveProjectTab(null)
    };
  }, [projectId, setFiles, clearWorkspace, setApiKey, setActiveProjectTab])

  useEffect(() => {
    setActiveProjectTab(activeTab)
  }, [activeTab, setActiveProjectTab])



  return (
    <ErrorBoundary>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-bg-main relative">
        <ProjectHeader
          projectTitle={projectTitle}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isSidebarCollapsed={isDashboardSidebarCollapsed}
          onToggleSidebar={() => setIsDashboardSidebarCollapsed(!isDashboardSidebarCollapsed)}
          isChatCollapsed={isChatCollapsed}
          onToggleChat={() => setIsChatCollapsed(!isChatCollapsed)}
          isLoading={isLoading}
          hasNoFiles={hasNoFiles}
          onSave={handleSaveChanges}
        />

        <div className="flex flex-1 overflow-hidden">
          <WorkspaceChat projectId={projectId} isCollapsed={isChatCollapsed} />

          {/* Content Area */}
          <div className="flex-1 flex overflow-hidden">
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center bg-bg-main text-text-muted">
                <Loader2 className="animate-spin mb-4" size={32} />
                <p className="text-sm font-medium">{t('loading', { fallback: 'Loading project workspace...' })}</p>
              </div>
            ) : activeTab === 'dashboard' ? (
              <ProjectDashboard
                isSidebarCollapsed={isDashboardSidebarCollapsed}
                setIsSidebarCollapsed={setIsDashboardSidebarCollapsed}
                projectInfo={projectInfo}
                projectId={projectId}
              />
            ) : hasNoFiles ? (
              <EmptyProjectView
                onStartChatting={() => {
                  setActiveTab('preview')
                  if (isChatCollapsed) setIsChatCollapsed(false);
                }}
              />
            ) : activeTab === 'code' ? (
              <ProjectCodeViewer projectId={projectId} getLanguageByPath={getLanguageByPath} />
            ) : (
              <ProjectPreviewViewer />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
