'use client'

import { useTranslations } from 'next-intl'
import { ChatMessageBubble } from './chat-message-bubble'
import { formatProjectSummary, parseProjectSummary } from '../lib/parse-project-summary'

// Renders the backend's project-summary message as structured markdown using
// the chat's normal markdown bubble — same chatbot typography as every other
// AI message, just with the flat emoji dump reshaped into headings/lists.
export const ProjectSummaryMessage = ({
  content,
  onAutoScroll,
}: {
  content: string
  onAutoScroll: () => void
}) => {
  const t = useTranslations('widgets.workspaceChat.projectSummary')
  const markdown = formatProjectSummary(parseProjectSummary(content), t)

  return <ChatMessageBubble role="ai" content={markdown} onAutoScroll={onAutoScroll} />
}
