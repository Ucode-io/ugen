import { ReactNode } from "react"
import ReactMarkdown from "react-markdown"

interface ChatMessageProps {
  role: 'user' | 'ai'
  content: string
}

export const ChatMessageBubble = ({ role, content }: ChatMessageProps) => {
  if (role === 'user') {
    return (
      <div className="flex w-full justify-end px-4 py-2">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-content-bg px-4 py-3 text-[15px] text-text-main shadow-sm">
          {content}
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
