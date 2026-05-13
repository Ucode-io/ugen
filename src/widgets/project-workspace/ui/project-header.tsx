'use client'
import {
  CodeXml,
  Globe,
  ImagePlus,
  LayoutDashboard,
  Loader2,
  Sparkles,
  BookTemplate,
  X,
} from "lucide-react";
import { useRef, useState } from "react"
import dynamic from "next/dynamic"
import type { ChatPosition } from "@/entities/chat"
import { useTranslations } from "next-intl"
import { githubApi, api } from "@/shared/api"
import { useRouter } from "@/shared/lib/i18n/navigation"
import { useAuthStore } from "@/entities/session"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ReusableTabs,
} from "@/shared/ui"
import { PublishPopover } from "./publish-popover"
import { GithubPopover } from "./github-popover"
import { LogoPopover } from "@/widgets/workspace-chat/ui/logo-popover"
import { Sidebar } from "@/widgets/sidebar"
import { cn } from "@/shared/lib/utils/cn"
import 'react-quill-new/dist/quill.snow.css'

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => (
    <div className="h-32 w-full animate-pulse rounded-lg border border-border-subtle bg-bg-sidebar/40" />
  ),
})

const QUILL_MODULES = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
}

export type DeviceType = 'desktop' | 'tablet' | 'mobile'

interface ProjectHeaderProps {
  projectTitle: string
  projectId?: string
  activeTab: 'dashboard' | 'code' | 'preview'
  setActiveTab: (tab: 'dashboard' | 'code' | 'preview') => void
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
  isLoading: boolean
  hasNoFiles: boolean
  onSave?: () => void
  isChatCollapsed: boolean
  onToggleChat: () => void
  chatPosition?: ChatPosition
  projectUrl?: string
  isUgen?: boolean
}

export const ProjectHeader = ({
  projectTitle,
  projectId,
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  onToggleSidebar,
  isLoading,
  hasNoFiles,
  onSave,
  isChatCollapsed,
  onToggleChat,
  projectUrl,
  isUgen = true,
}: ProjectHeaderProps) => {
  const t = useTranslations('features.project')
  const router = useRouter()
  const [isSidebarForced, setIsSidebarForced] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isLogoPopoverOpen, setIsLogoPopoverOpen] = useState(false)
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL ?? ''
  const { project } = useAuthStore()
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false)
  const [templateName, setTemplateName] = useState(projectTitle)
  const [templateDescription, setTemplateDescription] = useState('')
  const [previewLocalUrl, setPreviewLocalUrl] = useState<string | null>(null)
  const [previewFilename, setPreviewFilename] = useState<string | null>(null)
  const [screenshots, setScreenshots] = useState<{ id: string; localUrl: string; cdnUrl: string | null }[]>([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const screenshotInputRef = useRef<HTMLInputElement | null>(null)

  const previewUrl = previewLocalUrl ?? previewFilename ?? null

  const uploadPhoto = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/v1/files/folder_upload', formData, {
      params: { folder_name: 'Media' },
    })
    return `${cdnBase}/${data.data.link}` as string
  }

  const handlePreviewChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPreviewLocalUrl(URL.createObjectURL(file))
    setIsUploadingImage(true)
    try {
      const filename = await uploadPhoto(file)
      setPreviewFilename(filename)
    } catch (e) {
      console.error('Image upload failed', e)
    } finally {
      setIsUploadingImage(false)
    }
  }

  const handleScreenshotChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (screenshotInputRef.current) screenshotInputRef.current.value = ''
    const id = crypto.randomUUID()
    const localUrl = URL.createObjectURL(file)
    setScreenshots((prev) => [...prev, { id, localUrl, cdnUrl: null }])
    setIsUploadingScreenshot(true)
    try {
      const filename = await uploadPhoto(file)
      setScreenshots((prev) =>
        prev.map((s) => (s.id === id ? { ...s, cdnUrl: filename } : s))
      )
    } catch (e) {
      console.error('Screenshot upload failed', e)
      setScreenshots((prev) => prev.filter((s) => s.id !== id))
    } finally {
      setIsUploadingScreenshot(false)
    }
  }

  const handleRemovePreview = () => {
    setPreviewLocalUrl(null)
    setPreviewFilename(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemoveScreenshot = (id: string) => {
    setScreenshots((prev) => prev.filter((s) => s.id !== id))
  }

  const handleAddTemplate = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    try {
      await githubApi.post(
        '/v1/ugen-template',
        {
          name: templateName.trim() || projectTitle,
          description: templateDescription,
          photo: previewFilename || '',
          images: screenshots.filter((s) => s.cdnUrl).map((s) => s.cdnUrl as string),
          mcp_project_id: projectId,
          preview_url: projectUrl ?? '',
          source_project_id: project?.project_id ?? '',
          source_environment_id: project?.environment_id ?? '',
        },
        {
          params: { 'project-id': project?.project_id },
          headers: { 'environment-id': project?.environment_id ?? '' },
        }
      )
      setIsTemplateDialogOpen(false)
      setTimeout(() => router.push('/dashboard/templates'), 150)
    } catch (e) {
      console.error('Failed to add template', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSidebarVisible = (isHovered || isSidebarForced) && !isLogoPopoverOpen

  const handleChangeTab = (tab: 'dashboard' | 'code' | 'preview') => {
    if (tab === 'code' && activeTab !== 'code') {
      onSave?.()
    }
    setActiveTab(tab)
  }

  const allTabOptions = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
    {
      id: 'preview',
      label: 'Preview',
      icon: <Globe size={16} />,
      disabled: isLoading
    },
    {
      id: 'code',
      label: 'Code',
      icon: <CodeXml size={16} />,
    }
  ]

  const tabOptions = isUgen
    ? allTabOptions
    : allTabOptions.filter(t => t.id === 'preview')

  const toggleButton = isUgen && (
    <button
      onClick={onToggleChat}
      className="border-border-subtle flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-all"
      title={isChatCollapsed ? `Open AI Chat` : `Collapse AI Chat`}
    >
      <Sparkles size={16} className="text-primary/60" />
    </button>
  );

  return (
    <header className="bg-bg-main flex h-12 items-center justify-between px-4 shrink-0 z-10 transition-all duration-300">
      <div className="flex items-center gap-2 min-w-[135px]">
        <div
          className="relative shrink-0"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <LogoPopover
            projectTitle={projectTitle}
            open={isLogoPopoverOpen}
            onOpenChange={setIsLogoPopoverOpen}
          />
          <div className={cn(
            "pointer-events-none fixed left-0 top-12 bottom-0 z-180 -translate-x-4 opacity-0 transition-all duration-200 ease-out",
            isSidebarVisible && "pointer-events-auto translate-x-0 opacity-100"
          )}>
            <Sidebar
              className="h-full w-72 rounded-r-2xl border-r border-t border-b border-border-subtle shadow-2xl"
              hideLogo
              onProfilePopupChange={setIsSidebarForced}
            />
          </div>
        </div>
        <span className="text-[15px] font-medium text-text-main truncate max-w-[120px]">
          {projectTitle}
        </span>
      </div>

      <ReusableTabs
        options={tabOptions}
        activeId={activeTab}
        onTabChange={(id) => handleChangeTab(id as 'dashboard' | 'code' | 'preview')}
      />

      <div className="flex items-center gap-1.5 justify-end min-w-[135px]">
        <GithubPopover projectId={projectId} />
        {isUgen && (
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="border-border-subtle text-text-muted hover:text-text-main hover:bg-hover-bg flex h-7 shrink-0 items-center gap-1.5 rounded-lg border px-2 text-[12px] font-medium transition-all"
                title="Add to template"
                aria-label="Add to template"
              >
                <BookTemplate size={14} className="text-primary/70" />
                <span className="hidden sm:inline">Add template</span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[760px] gap-0 overflow-hidden p-0">
              <div className="border-b border-border-subtle px-5 py-4">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-text-main">
                    <BookTemplate size={16} className="text-primary" />
                    Add to templates
                  </DialogTitle>
                  <DialogDescription className="text-xs text-text-muted">
                    Create a reusable template from this workspace.
                  </DialogDescription>
                </DialogHeader>
              </div>

              <div className="px-5 py-5 flex flex-col gap-5">

                {/* Row 1: Preview image + Name & Description */}
                <div className="flex gap-5">
                  <div className="flex shrink-0 flex-col" style={{ width: 280 }}>
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                      Preview image
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handlePreviewChange}
                    />
                    {isUploadingImage ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-border-subtle bg-bg-sidebar/40" style={{ width: 280, minHeight: 240 }}>
                        <Loader2 size={24} className="animate-spin text-primary/60" />
                        <p className="text-[11px] text-text-muted">Uploading…</p>
                      </div>
                    ) : previewUrl ? (
                      <div className="group relative flex-1 overflow-hidden rounded-xl border border-border-subtle" style={{ width: 280, minHeight: 240 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="Template preview"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="rounded-lg bg-white/20 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm hover:bg-white/30"
                          >
                            Replace image
                          </button>
                          <button
                            type="button"
                            onClick={handleRemovePreview}
                            className="rounded-lg bg-white/10 px-3 py-1.5 text-[11px] font-medium text-white/80 hover:bg-white/20"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border-subtle bg-bg-sidebar/40 text-text-muted transition-colors hover:border-primary/50 hover:bg-bg-sidebar/60 hover:text-text-main"
                        style={{ width: 280, minHeight: 240 }}
                      >
                        <ImagePlus size={24} className="text-primary/60" />
                        <div className="text-center">
                          <p className="text-[12px] font-medium">Upload preview</p>
                          <p className="text-[10px] text-text-muted mt-0.5">PNG · JPG · 5MB</p>
                        </div>
                      </button>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-4">
                    <div>
                      <label htmlFor="template-name" className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        Template name
                      </label>
                      <input
                        id="template-name"
                        type="text"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="e.g. Mercury Bank landing"
                        className="h-10 w-full rounded-lg border border-border-subtle bg-bg-main px-3 text-sm text-text-main outline-none transition-all placeholder:text-text-muted focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                      />
                    </div>

                    <div className="flex flex-1 flex-col">
                      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                        Description
                      </span>
                      <div className="template-quill overflow-hidden rounded-lg border border-border-subtle bg-bg-main">
                        <ReactQuill
                          theme="snow"
                          value={templateDescription}
                          onChange={setTemplateDescription}
                          modules={QUILL_MODULES}
                          placeholder="Describe what this template includes…"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Row 2: Screenshots */}
                <div>
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Images
                  </span>
                  <input
                    ref={screenshotInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleScreenshotChange}
                  />
                  <div className="flex flex-wrap gap-2">
                    {screenshots.map((s) => (
                      <div
                        key={s.id}
                        className="group relative shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-bg-card shadow-sm"
                        style={{ width: 80, height: 56 }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={s.localUrl}
                          alt="Screenshot"
                          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                        {s.cdnUrl === null && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <Loader2 size={14} className="animate-spin text-white" />
                          </div>
                        )}
                        {s.cdnUrl !== null && (
                          <>
                            <div
                              className="absolute inset-0 cursor-zoom-in bg-black/0 transition-colors group-hover:bg-black/20"
                              onClick={() => setLightboxUrl(s.localUrl)}
                            />
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRemoveScreenshot(s.id) }}
                              className="absolute right-0.5 top-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-destructive text-white shadow group-hover:flex"
                            >
                              <X size={8} />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => screenshotInputRef.current?.click()}
                      disabled={isUploadingScreenshot}
                      className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border-subtle bg-bg-sidebar/40 text-text-muted shadow-sm transition-all hover:border-primary/50 hover:bg-bg-sidebar/70 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ width: 80, height: 56 }}
                    >
                      {isUploadingScreenshot ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <>
                          <ImagePlus size={16} />
                          <span className="text-[9px] font-medium">Add</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Lightbox */}
                  {lightboxUrl && (
                    <div
                      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                      onClick={() => setLightboxUrl(null)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={lightboxUrl}
                        alt="Screenshot preview"
                        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        type="button"
                        onClick={() => setLightboxUrl(null)}
                        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </div>

              </div>

              <DialogFooter className="border-t border-border-subtle bg-bg-sidebar/40 px-5 py-3">
                <DialogClose asChild>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-hover-bg hover:text-text-main"
                  >
                    Cancel
                  </button>
                </DialogClose>
                <button
                  type="button"
                  onClick={handleAddTemplate}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && <Loader2 size={13} className="animate-spin" />}
                  Add template
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {toggleButton}
        {isUgen && (
          <>
            <div className="bg-border-subtle w-[1px] h-4 mx-2" />
            <PublishPopover projectTitle={projectTitle} projectUrl={projectUrl} />
          </>
        )}
      </div>
    </header>
  )
}
