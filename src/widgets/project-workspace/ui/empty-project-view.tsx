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
          {t('createProject', { fallback: 'Your project will appear here' })}
        </h2>
        <p className="text-text-muted leading-relaxed">
          {t('emptyProjectDesc', { fallback: 'As soon as the AI generates your code, the live preview will show up right here. Describe what you want to build in the chat and watch it come to life.' })}
        </p>
      </div>
    </div>
  )
}
