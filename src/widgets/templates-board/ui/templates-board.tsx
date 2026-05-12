'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Layers, Loader2, X } from 'lucide-react'

import { useRouter } from '@/shared/lib/i18n/navigation'

import {
  fetchTemplateDetail,
  fetchTemplates,
  getTemplateDemoUrl,
  getTemplateDescription,
  getTemplateImage,
  getTemplateTitle,
  type Template,
} from '../model/templates'
import { useTemplateLaunch } from '../model/use-template-launch'

export const TemplatesBoard = () => {
  const t = useTranslations('Templates')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const { launchTemplate, launchingTemplateId } = useTemplateLaunch()

  const { data: templates = [], isLoading, isError } = useQuery({
    queryKey: ['ugen-templates'],
    queryFn: fetchTemplates,
    refetchOnWindowFocus: false,
  })

  const { data: selectedDetail, isLoading: isDetailLoading } = useQuery({
    queryKey: ['ugen-template', selectedId],
    queryFn: () => fetchTemplateDetail(selectedId as string),
    enabled: !!selectedId,
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  })

  useEffect(() => {
    setSelectedId(searchParams.get('template'))
  }, [searchParams])

  useEffect(() => {
    setIframeLoaded(false)
  }, [selectedId])

  const selectedFromList = templates.find((tpl) => tpl.id === selectedId) ?? null
  const selectedTemplate: Template | null = selectedDetail ?? selectedFromList

  const handleSelectTemplate = (template: Template) => {
    setSelectedId(template.id)
    router.push(`/dashboard/templates?template=${template.id}`, { scroll: false })
  }

  const handleOpenChange = (open: boolean) => {
    if (open) return
    setSelectedId(null)
    router.push('/dashboard/templates', { scroll: false })
  }

  const demoUrl = selectedTemplate ? getTemplateDemoUrl(selectedTemplate) : ''
  const selectedTitle = selectedTemplate ? getTemplateTitle(selectedTemplate) : ''

  return (
    <div className="p-8 h-full bg-bg-main overflow-y-auto">
      <div className="max-w-300 mx-auto">
        <h1 className="text-3xl font-bold text-text-main mb-8">{t('title')}</h1>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <div className="w-full aspect-16/10 rounded-xl bg-bg-sidebar/60 animate-pulse" />
                <div className="space-y-1.5">
                  <div className="h-4 w-1/2 rounded bg-bg-sidebar/60 animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-bg-sidebar/40 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-border-subtle bg-bg-card p-8 text-center text-text-muted">
            Failed to load templates. Please try again later.
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-subtle bg-bg-card p-12 text-center text-text-muted">
            No templates available yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={handleSelectTemplate}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog.Root open={!!selectedId} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />
          <Dialog.Content
            className="fixed left-[50%] top-[50%] z-50 w-[95vw] max-w-300 h-[90vh] translate-x-[-50%] translate-y-[-50%] bg-bg-card border border-border-subtle rounded-xl shadow-2xl overflow-hidden flex flex-col focus:outline-none"
          >
            <Dialog.Title className="sr-only">Template Preview</Dialog.Title>
            <Dialog.Description className="sr-only">
              Preview of {selectedTitle}
            </Dialog.Description>

            {selectedTemplate && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0 bg-bg-card">
                  <h2 className="text-xl font-bold text-text-main truncate">
                    {selectedTitle}
                  </h2>
                  <div className="flex items-center gap-2 shrink-0">
                    {demoUrl && (
                      <a
                        href={demoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-subtle px-3 text-sm font-medium text-text-main transition-colors hover:bg-hover-bg"
                      >
                        <ExternalLink size={16} />
                        {t('demo')}
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        launchTemplate(selectedTemplate, { title: selectedTitle })
                      }
                      disabled={launchingTemplateId === selectedTemplate.id}
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-blue-500 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {launchingTemplateId === selectedTemplate.id && (
                        <Loader2 size={16} className="animate-spin" />
                      )}
                      {t('use_template')}
                    </button>
                    <Dialog.Close asChild>
                      <button className="text-text-muted hover:text-text-main transition-colors p-1.5 rounded-md hover:bg-hover-bg">
                        <X size={20} />
                      </button>
                    </Dialog.Close>
                  </div>
                </div>

                <div className="flex-1 w-full bg-zinc-100 dark:bg-zinc-900 relative">
                  {!iframeLoaded && (isDetailLoading || demoUrl) ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-bg-card/80 backdrop-blur-sm">
                      <Loader2 size={32} className="animate-spin text-primary" />
                      <p className="text-sm text-text-muted">
                        {isDetailLoading ? 'Loading template…' : 'Loading demo…'}
                      </p>
                    </div>
                  ) : null}
                  {demoUrl ? (
                    <iframe
                      key={demoUrl}
                      src={demoUrl}
                      className="absolute inset-0 w-full h-full border-0"
                      title={selectedTitle}
                      sandbox="allow-scripts allow-same-origin"
                      onLoad={() => setIframeLoaded(true)}
                    />
                  ) : !isDetailLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center text-text-muted text-sm">
                      Demo URL not available for this template.
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}

const TemplateCard = ({
  template,
  onSelect,
}: {
  template: Template
  onSelect: (template: Template) => void
}) => {
  const title = getTemplateTitle(template)
  const description = getTemplateDescription(template)
  const image = getTemplateImage(template)

  return (
    <div
      className="group cursor-pointer flex flex-col gap-3"
      onClick={() => onSelect(template)}
    >
      <div className="w-full aspect-16/10 rounded-xl overflow-hidden shadow-sm transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md bg-bg-sidebar border border-border-subtle relative">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-linear-to-br from-primary/20 via-primary/10 to-bg-sidebar p-6 text-center">
            <div className="bg-primary/15 mb-3 flex h-12 w-12 items-center justify-center rounded-xl">
              <Layers className="text-primary" size={22} />
            </div>
            <p className="text-text-main text-sm font-semibold">{title}</p>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-[15px] font-semibold text-text-main truncate">
          {title}
        </h3>
        {description && (
          <p className="text-[13px] text-text-muted mt-0.5 line-clamp-2">
            {description}
          </p>
        )}
      </div>
    </div>
  )
}
