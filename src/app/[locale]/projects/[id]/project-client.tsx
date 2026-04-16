'use client'
import { useState, useEffect, useCallback } from "react"
import { WorkspaceChat } from "@/widgets/workspace-chat"
import { PanelLeftClose, PanelRightClose, ChevronLeft, CodeXml, Globe, Loader2, Play } from "lucide-react"
import { ProjectCodeViewer } from "@/widgets/project-workspace/ui/project-code-viewer"
import { ProjectPreviewViewer } from "@/widgets/project-workspace/ui/project-preview-viewer"
import { useRouter } from "@/shared/lib/i18n/navigation"
import { api } from "@/shared/api"
import { useTranslations } from "next-intl"
import { useAuthStore } from '@/entities/session'
import type { CodeEditorTarget } from '@/entities/session'
import { useCodeSelectionStore } from "@/entities/project/model/code-selection-store"
import { useFilesStore, IFile } from "@/entities/project/model/files-store"

import { ProjectHeader, DeviceType } from "@/widgets/project-workspace/ui/project-header"
import { ProjectDashboard } from "@/widgets/project-workspace/ui/project-dashboard"
import { EmptyProjectView } from "@/widgets/project-workspace/ui/empty-project-view"
import { ErrorBoundary } from "@/shared/ui"
import { usePathname, useSearchParams } from "next/navigation"

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
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [isDashboardSidebarCollapsed, setIsDashboardSidebarCollapsed] = useState(false)
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [device, setDevice] = useState<DeviceType>('desktop')
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false)
  const [microfrontendPreviewFiles, setMicrofrontendPreviewFiles] = useState<{ path: string; content: string }[] | null>(null)

  const handleTogglePreviewMaximize = useCallback(() => {
    setIsPreviewMaximized((prev) => {
      const next = !prev
      setIsChatCollapsed(next)
      return next
    })
  }, [])
  const [projectTitle, setProjectTitle] = useState('Loading...')
  const [isLoading, setIsLoading] = useState(true)
  const [projectInfo, setProjectInfo] = useState<any>(null)
  const { files, updatedFiles, setFiles, clearWorkspace } = useFilesStore()
  const setApiKey = useAuthStore(state => state.setApiKey)
  const setUcodeProjectId = useAuthStore(state => state.setUcodeProjectId)
  const setProjectEnvId = useAuthStore(state => state.setProjectEnvId)
  const setActiveProjectTab = useAuthStore(state => state.setActiveProjectTab)
  const setCodeEditorTarget = useAuthStore(state => state.setCodeEditorTarget)
  const clearCodeSelection = useCodeSelectionStore(state => state.clearCodeSelection)
  const hasNoFiles = files.length === 0;
  const t = useTranslations('features.project')

  const { project } = useAuthStore()
  const isUgen = project?.is_ugen ?? false

  const activeTab = searchParams.get('tab') as 'dashboard' | 'code' | 'preview' || 'preview'

  const setActiveTab = useCallback((tab: 'dashboard' | 'code' | 'preview') => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [searchParams, pathname, router])

  const handleSaveChanges = () => {
    if (updatedFiles.length > 0) {
      api.put(`/v1/mcp_project/${projectId}`, {
        project_files: updatedFiles
      })
    }
  }

  const handleEditCode = (target: CodeEditorTarget) => {
    console.log({ target })
    setCodeEditorTarget(target)
    setActiveTab('code')
  }

  const handlePreviewMicrofrontend = useCallback((files: { path: string; content: string }[]) => {
    setMicrofrontendPreviewFiles(files)
    setActiveTab('preview')
  }, [setActiveTab])

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

        if (projectData.environment_id) {
          setProjectEnvId(projectData.environment_id)
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
      setApiKey(null)
      setActiveProjectTab(null)
      clearCodeSelection()
    };
  }, [projectId, setFiles, clearWorkspace, setApiKey, setActiveProjectTab, clearCodeSelection])

  useEffect(() => {
    setActiveProjectTab(activeTab)
  }, [activeTab, setActiveProjectTab])


  if (!isUgen) {
    return (
      <ErrorBoundary>
        <div className="relative h-screen w-full">
          <button
            onClick={() => router.push('/')}
            className="absolute top-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-black/40 px-3 py-2 text-sm font-medium text-white opacity-20 backdrop-blur-sm transition-opacity duration-200 hover:opacity-100"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <iframe
            src="https://kun.uz"
            className="h-full w-full border-none"
            title={projectTitle}
          />
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-bg-main relative">
        {!isPreviewMaximized && (
          <ProjectHeader
            projectTitle={projectTitle}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isSidebarCollapsed={isDashboardSidebarCollapsed}
            onToggleSidebar={() => setIsDashboardSidebarCollapsed(!isDashboardSidebarCollapsed)}
            isLoading={isLoading}
            hasNoFiles={hasNoFiles}
            onSave={handleSaveChanges}
            isChatCollapsed={isChatCollapsed}
            onToggleChat={() => setIsChatCollapsed(!isChatCollapsed)}
            projectUrl={projectInfo?.url || projectInfo?.project_url || ''}
          />
        )}

        <div className="flex flex-1 overflow-hidden">
          <WorkspaceChat
            projectId={projectId}
            isChatCollapsed={isChatCollapsed}
            setIsChatCollapsed={setIsChatCollapsed}
            onSelectFunction={handleEditCode}
            onSelectMicrofrontend={handlePreviewMicrofrontend}
          />

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
                onEditCode={handleEditCode}
              />
            ) : hasNoFiles ? (
              <EmptyProjectView
                onStartChatting={() => {
                  setActiveTab('preview')
                  // if (isChatCollapsed) setIsChatCollapsed(false);
                }}
              />
            ) : activeTab === 'code' ? (
              <ProjectCodeViewer projectId={projectId} getLanguageByPath={getLanguageByPath} />
            ) : (
              <ProjectPreviewViewer
                device={device}
                isMaximized={isPreviewMaximized}
                microfrontendFiles={microfrontendPreviewFiles}
                projectId={projectId}
                onDeviceChange={setDevice}
                onToggleMaximize={handleTogglePreviewMaximize}
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  )
}
