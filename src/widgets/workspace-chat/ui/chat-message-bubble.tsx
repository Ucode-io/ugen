import { ReactNode } from "react"
import ReactMarkdown from "react-markdown"

interface ChatMessageProps {
  role: 'user' | 'ai' | 'assistant'
  content: string
  type?: 'text' | 'audio'
  audioUrl?: string
}

export const ChatMessageBubble = ({ role, content, type, audioUrl }: ChatMessageProps) => {
  if (role === 'user') {
    return (
      <div className="flex w-full justify-end px-4 py-2">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-content-bg px-4 py-3 text-[15px] text-text-main shadow-sm flex flex-col gap-2">
          {type === 'audio' && audioUrl ? (
            <audio src={audioUrl} controls className="h-10 w-[200px]" />
          ) : null}
          {content && <span>{content}</span>}
        </div>
      </div>
    )
  }

  // AI message as Markdown without strict bubble
  return (
    <div className="flex w-full justify-start px-4 py-4">
      <div className="max-w-full text-[15px] text-text-main prose prose-sm dark:prose-invert prose-p:leading-relaxed prose-pre:bg-bg-card prose-pre:border-border-subtle prose-pre:border">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  )
}
