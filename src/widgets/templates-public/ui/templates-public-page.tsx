'use client'
import { useQuery } from '@tanstack/react-query'
import { Layers } from 'lucide-react'
import { Link } from '@/shared/lib/i18n/navigation'
import { Footer } from '@/widgets/footer'
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

export const TemplatesPublicPage = () => {
  const { data: templates = [], isLoading, isError } = useQuery({
    queryKey: ['ugen-templates-public'],
    queryFn: fetchPublicTemplates,
    refetchOnWindowFocus: false,
  })

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      {/* Hero */}
      <div className="bg-bg-card border-b border-border-subtle px-6 text-center py-20">
        <span className="inline-block bg-bg-main border border-border-subtle rounded-full text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-text-muted px-3 py-1 mb-[18px]">
          Templates
        </span>
        <h1 className="font-extrabold tracking-[-0.04em] leading-[1.1] text-text-main mb-4 max-w-[700px] mx-auto"
          style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>
          Launch faster with{' '}
          <em className="not-italic bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">ready-made templates</em>
        </h1>
        <p className="text-[1rem] text-text-muted max-w-[500px] mx-auto leading-[1.7] mb-8">
          Production-ready app templates across every category. Clone, customise, and ship in minutes.
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }))}
          className="inline-block bg-primary text-white text-[0.95rem] font-semibold px-7 py-3 rounded-lg hover:opacity-85 transition-all cursor-pointer border-none"
        >
          Use a template free →
        </button>
      </div>

      {/* Content */}
      <section className="px-6 py-16 flex-1">
        <div className="max-w-[1100px] mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-bg-main border border-border-subtle rounded-[10px] overflow-hidden"
                >
                  <div className="aspect-video bg-hover-bg border-b border-border-subtle animate-pulse" />
                  <div className="p-3.5 space-y-2">
                    <div className="h-3 w-2/3 rounded bg-hover-bg animate-pulse" />
                    <div className="h-2.5 w-full rounded bg-hover-bg/70 animate-pulse" />
                  </div>
                </div>
              ))
            ) : isError ? (
              <div className="col-span-full text-center text-text-muted border border-dashed border-border-subtle rounded-xl py-12">
                Failed to load templates. Please try again later.
              </div>
            ) : templates.length === 0 ? (
              <div className="col-span-full text-center text-text-muted border border-dashed border-border-subtle rounded-xl py-12">
                No templates available yet.
              </div>
            ) : (
              templates.map((template) => {
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
                    <div className="p-3.5">
                      <h4 className="text-[0.85rem] font-bold text-text-main mb-1 truncate">
                        {title}
                      </h4>
                      {description && (
                        <div
                          className="text-[0.76rem] text-text-muted leading-[1.5] line-clamp-2 [&_p]:m-0"
                          dangerouslySetInnerHTML={{ __html: description }}
                        />
                      )}
                    </div>
                  </Link>
                )
              })
            )}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <div className="bg-bg-card border-t border-border-subtle py-20 px-6 text-center">
        <h2 className="font-extrabold tracking-[-0.04em] text-text-main mb-3"
          style={{ fontSize: 'clamp(1.6rem, 3vw, 2.6rem)' }}>
          Find your template and ship today
        </h2>
        <p className="text-[0.95rem] text-text-muted mb-7">All templates are free to clone on any plan.</p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-auth', { detail: 'register' }))}
          className="inline-block bg-primary text-white text-[0.95rem] font-semibold px-7 py-3 rounded-lg hover:opacity-85 transition-all cursor-pointer border-none"
        >
          Get started →
        </button>
      </div>

      <Footer />
    </div>
  )
}
