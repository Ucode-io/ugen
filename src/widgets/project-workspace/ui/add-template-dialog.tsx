'use client'
import { BookTemplate, ImagePlus, Loader2, X } from "lucide-react"
import { useRef, useState } from "react"
import dynamic from "next/dynamic"
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
} from "@/shared/ui"
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

interface AddTemplateDialogProps {
  projectTitle: string
  projectId?: string
  projectUrl?: string
}

export const AddTemplateDialog = ({ projectTitle, projectId, projectUrl }: AddTemplateDialogProps) => {
  const router = useRouter()
  const { project } = useAuthStore()
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL ?? ''

  const [isOpen, setIsOpen] = useState(false)
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
      setIsOpen(false)
      setTimeout(() => router.push('/dashboard/templates'), 150)
    } catch (e) {
      console.error('Failed to add template', e)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border-subtle px-2.5 py-1.5 text-[12px] font-medium text-text-muted transition-colors hover:bg-hover-bg hover:text-text-main"
        >
          <BookTemplate size={13} className="text-primary/70" />
          Add template
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
  )
}
