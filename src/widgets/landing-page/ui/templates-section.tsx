'use client'

import { useQuery } from '@tanstack/react-query'
import { Layers } from 'lucide-react'
import { Link } from '@/shared/lib/i18n/navigation'
import { useTranslations } from 'next-intl'
import {
  fetchPublicTemplates,
  getTemplateDescription,
  getTemplateImage,
  getTemplateTitle,
} from '@/widgets/templates-board/model/templates'

const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL ?? ''

const buildImageUrl = (raw: string) => {
  const full = raw.includes('https') ? raw : `${cdnBase}/${raw}`
  try {
    return encodeURI(decodeURI(full))
  } catch {
    return full
  }
}

export const TemplatesSection = () => {
  const t = useTranslations('widgets.landingPage.templates')
  const { data: templates = [], isLoading, isError } = useQuery({
    queryKey: ['ugen-templates-public'],
    queryFn: fetchPublicTemplates,
    refetchOnWindowFocus: false,
  })

  const items = templates.slice(0, 8)

  if (!isLoading && (isError || items.length === 0)) return null

  return (
    <section className="py-20 px-6 bg-bg-card border-y border-border-subtle">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <span className="inline-flex items-center bg-bg-main border border-border-subtle rounded-full px-[11px] py-[3px] text-[0.67rem] font-semibold uppercase tracking-[0.08em] text-text-muted mb-3">
              {t('badge')}
            </span>
            <h2 className="font-extrabold tracking-[-0.04em] leading-[1.12] text-text-main mb-2.5"
              style={{ fontSize: 'clamp(1.6rem, 3vw, 2.4rem)' }}>
              {t('titleLead')}{' '}
              <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t('titleAccent')}
              </em>
            </h2>
            <p className="text-[0.95rem] text-text-muted max-w-[560px] leading-[1.75]">
              {t('subtitle')}
            </p>
          </div>
          <Link
            href="/templates"
            className="text-[0.82rem] font-semibold text-text-muted border border-border-subtle px-4 py-2 rounded-lg hover:border-border-subtle/60 hover:text-text-main transition-all no-underline"
          >
            {t('browseAll')}
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-bg-main border border-border-subtle rounded-[10px] overflow-hidden"
                >
                  <div className="aspect-video bg-hover-bg border-b border-border-subtle animate-pulse" />
                  <div className="p-[13px_15px] space-y-2">
                    <div className="h-3 w-2/3 rounded bg-hover-bg animate-pulse" />
                    <div className="h-2.5 w-full rounded bg-hover-bg/70 animate-pulse" />
                  </div>
                </div>
              ))
            : items.map((template) => {
                const title = getTemplateTitle(template)
                const description = getTemplateDescription(template)
                const rawImage = getTemplateImage(template)
                const image = rawImage ? buildImageUrl(rawImage) : ''

                return (
                  <Link
                    key={template.id}
                    href={`/templates/${template.id}` as any}
                    className="bg-bg-main border border-border-subtle rounded-[10px] overflow-hidden no-underline text-current block transition-all hover:border-border-subtle/60 hover:shadow-md hover:-translate-y-0.5"
                  >
                    <div className="aspect-video bg-hover-bg border-b border-border-subtle overflow-hidden">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt={title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Layers className="text-text-muted" size={22} />
                        </div>
                      )}
                    </div>
                    <div className="p-[13px_15px]">
                      <h4 className="text-[0.83rem] font-bold text-text-main mb-0.5 truncate">
                        {title}
                      </h4>
                      {description && (
                        <div
                          className="text-[0.74rem] text-text-muted leading-[1.5] line-clamp-2 [&_p]:m-0"
                          dangerouslySetInnerHTML={{ __html: description }}
                        />
                      )}
                    </div>
                  </Link>
                )
              })}
        </div>
      </div>
    </section>
  )
}
