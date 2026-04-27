'use client'
import { useState, useEffect, useCallback } from "react"
import { WorkspaceChat } from "@/widgets/workspace-chat"
import { Loader2 } from "lucide-react"
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
import { WorkspaceLoader } from "@/widgets/project-workspace/ui/workspace-loader"
import { ProjectDashboard } from "@/widgets/project-workspace/ui/project-dashboard"
import { EmptyProjectView } from "@/widgets/project-workspace/ui/empty-project-view"
import { ErrorBoundary, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui"
import { usePathname, useSearchParams } from "next/navigation"
import { useChatStore } from "@/entities/chat"
import { cn } from "@/shared/lib/utils/cn"
import { queryClient } from "@/shared/api/query-client"

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
  const [loadedProjectId, setLoadedProjectId] = useState<string | null>(null)

  // Synchronously reset loading state when projectId changes (before cleanup runs).
  // This prevents EmptyProjectView from flashing when navigating between projects.
  if (loadedProjectId !== null && loadedProjectId !== projectId && !isLoading) {
    setIsLoading(true)
  }
  const [projectInfo, setProjectInfo] = useState<any>(null)
  const [microfrontends, setMicrofrontends] = useState<Array<{ id: string; name: string; url: string }>>([])
  const [selectedMicrofrontend, setSelectedMicrofrontend] = useState<{ id: string; name: string; url: string } | null>(null)
  const [isMicrofrontendLoading, setIsMicrofrontendLoading] = useState(false)
  const { files, updatedFiles, setFiles, clearWorkspace } = useFilesStore()
  const setApiKey = useAuthStore(state => state.setApiKey)
  const setUcodeProjectId = useAuthStore(state => state.setUcodeProjectId)
  const setProjectEnvId = useAuthStore(state => state.setProjectEnvId)
  const setActiveProjectTab = useAuthStore(state => state.setActiveProjectTab)
  const setCodeEditorTarget = useAuthStore(state => state.setCodeEditorTarget)
  const clearCodeSelection = useCodeSelectionStore(state => state.clearCodeSelection)
  const activeCodeFiles = useCodeSelectionStore(state => state.activeCodeFiles)
  const chatPosition = useChatStore(state => state.chatPosition)
  const hasNoFiles = files.length === 0 && !activeCodeFiles?.length;
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
    if (!projectId) return

    // ⚡ Immediately clear previous project's apiKey & tab BEFORE any async requests.
    // Without this, requests fired during loading would still carry the stale apiKey
    // from the previous project (race condition between cleanup and new effect start).
    setApiKey(null)
    setActiveProjectTab(null)

    // Drop all cached queries so we don't flash data from the previous project
    // (e.g. github integration status, pricing, resources, microfrontends).
    queryClient.clear()

    setIsLoading(true);
    setProjectInfo(null);
    // Fetch project details and files
    api.get(`/v1/mcp_project/${projectId}`)
      .then(res => {
        const projectData = res.data?.data;
        if (!projectData) {
          return;
        }

        // Save API key for dashboard requests
        if (projectData.api_key) {
          setApiKey(projectData.api_key, projectId)
        } else {
          setApiKey(null)
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
        setLoadedProjectId(projectId);
      })

    // Fetch additional company project info using query param API
    api.get('/v1/company-project', { params: { 'project-id': projectId } })
      .then(res => {
        const info = res.data?.data;
        if (info) {
          setProjectInfo(Array.isArray(info) ? info[0] : info);
        }
      })
      .catch((err) => {
        console.error("Failed to load company project info", err);
      });

    return () => {
      setIsLoading(true);
      clearWorkspace();
      setApiKey(null)
      setActiveProjectTab(null)
      clearCodeSelection()
    };
  }, [projectId, setFiles, clearWorkspace, setApiKey, setActiveProjectTab, clearCodeSelection])

  useEffect(() => {
    setActiveProjectTab(activeTab)
  }, [activeTab, setActiveProjectTab])

  useEffect(() => {
    if (!projectId || isUgen) return
    setIsMicrofrontendLoading(true)
    api.get('/v2/functions/micro-frontend', {
      params: { search: '', offset: 0, limit: 50, 'project-id': projectId },
    })
      .then(res => {
        const list: Array<{ id: string; name: string; url: string }> = res.data?.data?.functions ?? []
        const normalized = list
          .map(mf => ({
            ...mf,
            url: mf.url?.startsWith('http') ? mf.url : `https://${mf.url}`,
          }))
          .sort((a, b) => a.name.localeCompare(b.name))
        setMicrofrontends(normalized)
        setSelectedMicrofrontend(normalized[0] ?? null)
      })
      .catch(err => console.error('Failed to load microfrontends', err))
      .finally(() => setIsMicrofrontendLoading(false))
  }, [projectId, isUgen])

  if (!isUgen) {
    return (
      <ErrorBoundary>
        <div className="flex h-screen w-full flex-col overflow-hidden bg-bg-main">
          {isMicrofrontendLoading ? (
            <div className="flex-1 relative overflow-hidden">
              <WorkspaceLoader message="Loading microfrontends..." subMessage="Fetching project workspace" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 px-4 border-b border-border-subtle bg-bg-card shrink-0 h-[48px]">
                <button
                  onClick={() => router.push('/projects')}
                  className="flex items-center gap-2.5 text-text-muted hover:text-text-main transition-colors"
                >
                  <img src="/logo.svg" alt={projectTitle} className="h-6 w-6 rounded object-contain" />
                </button>
                {microfrontends.length > 0 && (
                  <Select
                    value={selectedMicrofrontend?.id ?? ''}
                    onValueChange={id => {
                      const mf = microfrontends.find(m => m.id === id)
                      if (mf) setSelectedMicrofrontend(mf)
                    }}
                  >
                    <SelectTrigger className="w-auto min-w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {microfrontends.map(mf => (
                        <SelectItem key={mf.id} value={mf.id}>{mf.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              {selectedMicrofrontend?.url ? (
                <iframe
                  key={selectedMicrofrontend.id}
                  src={selectedMicrofrontend.url}
                  className="flex-1 w-full border-none"
                  title={selectedMicrofrontend.name}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-text-muted">
                  <p className="text-sm font-medium">No preview available</p>
                </div>
              )}
            </>
          )}
        </div>
      </ErrorBoundary>
    )
  }

  return (
    <ErrorBoundary>
      <div
        className="h-screen w-full overflow-hidden bg-bg-main relative"
        style={{
          display: 'grid',
          gridTemplateColumns: isChatCollapsed || isPreviewMaximized ? '0 1fr' : `${chatPosition === 'right' ? '1fr auto' : 'auto 1fr'}`,
          gridTemplateRows: 'auto 1fr',
          gridTemplateAreas: chatPosition === 'right'
            ? '"header chat" "preview chat"'
            : '"chat header" "chat preview"',
        }}
      >
        {/* Chat — spans full height */}
        <div style={{ gridArea: 'chat', minWidth: 0, overflow: 'hidden', height: '100%' }}>
          <WorkspaceChat
            projectId={projectId}
            projectTitle={projectTitle}
            isChatCollapsed={isChatCollapsed}
            setIsChatCollapsed={setIsChatCollapsed}
            onSelectFunction={handleEditCode}
            onSelectMicrofrontend={handlePreviewMicrofrontend}
            isPreviewMaximized={isPreviewMaximized}
          />
        </div>

        {/* Header */}
        {!isPreviewMaximized && (
          <div style={{ gridArea: 'header' }} className="min-w-0 py-2">
            <ProjectHeader
              projectTitle={projectTitle}
              projectId={projectId}
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
              isUgen={isUgen}
            />
          </div>
        )}

        {/* Content Area */}
        <div style={{ gridArea: 'preview' }} className="relative flex overflow-hidden min-w-0">
          {isLoading ? (
            <WorkspaceLoader message="Loading project workspace..." />
          ) : (activeTab === 'preview' && !hasNoFiles) ? (
            <ProjectPreviewViewer
              device={device}
              isMaximized={isPreviewMaximized}
              microfrontendFiles={microfrontendPreviewFiles}
              projectId={projectId}
              onDeviceChange={setDevice}
              onToggleMaximize={handleTogglePreviewMaximize}
              isChatCollapsed={isChatCollapsed}
            />
          ) : activeTab === 'dashboard' ? (
            <ProjectDashboard
              isSidebarCollapsed={isDashboardSidebarCollapsed}
              setIsSidebarCollapsed={setIsDashboardSidebarCollapsed}
              projectInfo={projectInfo}
              projectId={projectId}
              onEditCode={handleEditCode}
            />
          ) : hasNoFiles ? (
            <EmptyProjectView onStartChatting={() => setActiveTab('preview')} />
          ) : (
            <ProjectCodeViewer projectId={projectId} getLanguageByPath={getLanguageByPath} />
          )}
        </div>
      </div>
    </ErrorBoundary>
  )
}
