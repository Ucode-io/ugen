'use client'
import { useState, useEffect } from "react"
import { WorkspaceChat } from "@/widgets/workspace-chat"
import { PanelLeftClose, PanelRightClose, ChevronLeft, CodeXml, Globe, Loader2, Play } from "lucide-react"
import { ProjectCodeViewer } from "@/widgets/project-workspace/ui/project-code-viewer"
import { ProjectPreviewViewer } from "@/widgets/project-workspace/ui/project-preview-viewer"
import { useRouter } from "@/shared/lib/i18n/navigation"
import { api } from "@/shared/api"
import { useTranslations } from "next-intl"

import { useFilesStore, IFile } from "@/entities/project/model/files-store"

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
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('preview')
  const [projectTitle, setProjectTitle] = useState('Loading...')
  const [isLoading, setIsLoading] = useState(true)
  const [hasNoFiles, setHasNoFiles] = useState(false)
  const { setFiles, clearWorkspace } = useFilesStore()
  const router = useRouter()
  const t = useTranslations('features.project')

  useEffect(() => {
    setIsLoading(true);
    // Fetch project details and files
    api.get(`/v1/mcp_project/${projectId}`)
      .then(res => {
        const projectData = res.data?.data;
        if (!projectData) {
          setHasNoFiles(true);
          return;
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
          setHasNoFiles(false);
        } else {
          setHasNoFiles(true);
        }
      })
      .catch((err) => {
        console.error("Failed to load project details", err);
        setProjectTitle('Workspace Project');
        setHasNoFiles(true);
      })
      .finally(() => {
        setIsLoading(false);
      })

    return () => {
      clearWorkspace();
    };
  }, [projectId, setFiles, clearWorkspace])

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
              disabled={hasNoFiles || isLoading}
              className={`p-1 rounded-md transition-colors flex items-center justify-center shrink-0 group relative ${activeTab === 'preview'
                ? 'bg-bg-card shadow-sm text-text-main'
                : 'text-text-muted hover:text-text-main hover:bg-hover-bg disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
            >
              <Globe size={16} />
              <div className="absolute top-10 whitespace-nowrap bg-bg-tooltip text-text-tooltip text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Preview
              </div>
            </button>
            <button
              onClick={() => setActiveTab('code')}
              disabled={hasNoFiles || isLoading}
              className={`p-1 rounded-md transition-colors flex items-center justify-center shrink-0 group relative ${activeTab === 'code'
                ? 'bg-bg-card shadow-sm text-text-main'
                : 'text-text-muted hover:text-text-main hover:bg-hover-bg disabled:opacity-50 disabled:cursor-not-allowed'
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
            {t('publish', { fallback: 'Publish' })}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <WorkspaceChat projectId={projectId} isCollapsed={isChatCollapsed} />

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-bg-main text-text-muted">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p className="text-sm font-medium">{t('loading', { fallback: 'Loading project workspace...' })}</p>
            </div>
          ) : hasNoFiles ? (
            <div className="flex-1 flex items-center justify-center bg-bg-main bg-[url('/grid.svg')] dark:bg-[url('/grid-dark.svg')] bg-center px-4">
              <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Play size={40} className="text-primary ml-1" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-text-main">
                  {t('createProject', { fallback: 'Create your project' })}
                </h2>
                <p className="text-text-muted leading-relaxed">
                  {t('emptyProjectDesc', { fallback: 'Your workspace is currently empty. Describe what you want to build in the chat, and the AI will generate the files and architecture for you in seconds.' })}
                </p>
                <div className="pt-4 flex justify-center">
                  <button
                    onClick={() => {
                      if (isChatCollapsed) setIsChatCollapsed(false);
                      // focus on chat input if possible later
                    }}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring gap-2 leading-none"
                  >
                    {t('startChatting', { fallback: 'Start Chatting' })}
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === 'code' ? (
            <ProjectCodeViewer />
          ) : (
            <ProjectPreviewViewer />
          )}
        </div>
      </div>
    </div>
  )
}
