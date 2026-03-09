'use client'
import { Play } from "lucide-react"
import { useTranslations } from "next-intl"

interface EmptyProjectViewProps {
  onStartChatting: () => void
}

export const EmptyProjectView = ({ onStartChatting }: EmptyProjectViewProps) => {
  const t = useTranslations('features.project')

  return (
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
            onClick={onStartChatting}
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring gap-2 leading-none"
          >
            {t('startChatting', { fallback: 'Start Chatting' })}
          </button>
        </div>
      </div>
    </div>
  )
}
