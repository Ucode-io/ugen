'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ExternalLink, Image as ImageIcon, Briefcase, ShoppingBag, CalendarDays, BookOpen, Layers } from 'lucide-react'

import { TEMPLATES } from '../model/templates'

export const TemplatesBoard = () => {
  const t = useTranslations('Templates')
  const [selectedTemplate, setSelectedTemplate] = useState<typeof TEMPLATES[0] | null>(null)

  return (
    <div className="p-8 h-full bg-bg-main overflow-y-auto">
      <div className="max-w-[1200px] mx-auto">
        <h1 className="text-3xl font-bold text-text-main mb-8">{t('title')}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TEMPLATES.map((template) => (
            <div
              key={template.id}
              className="group cursor-pointer flex flex-col gap-3"
              onClick={() => setSelectedTemplate(template)}
            >
              <div
                className={`w-full aspect-[16/10] rounded-xl overflow-hidden shadow-sm transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-md ${template.bg}`}
              >
                {template.content && template.content}
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-text-main">
                  {t(`cards.${template.id}.title`)}
                </h3>
                <p className="text-[13px] text-text-muted mt-0.5">
                  {t(`cards.${template.id}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog.Root open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity" />
          <Dialog.Content
            className="fixed left-[50%] top-[50%] z-50 w-[95vw] max-w-[1200px] h-[90vh] translate-x-[-50%] translate-y-[-50%] bg-bg-card border border-border-subtle rounded-xl shadow-2xl overflow-hidden flex flex-col focus:outline-none"
          >
            <Dialog.Title className="sr-only">Template Preview</Dialog.Title>
            <Dialog.Description className="sr-only">Preview of {selectedTemplate ? t(`cards.${selectedTemplate.id}.title`) : ''}</Dialog.Description>

            {selectedTemplate && (
              <>
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle shrink-0 bg-bg-card">
                  <h2 className="text-xl font-bold text-text-main">
                    {t(`cards.${selectedTemplate.id}.title`)}
                  </h2>
                  <div className="flex items-center gap-4">
                    <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
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
                  <iframe
                    src={selectedTemplate.link}
                    className="absolute inset-0 w-full h-full border-0"
                    title={t(`cards.${selectedTemplate.id}.title`)}
                    sandbox="allow-scripts allow-same-origin"
                  />
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
