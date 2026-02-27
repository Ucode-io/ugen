"use client"
import { useState } from "react"
import { PanelLeftClose, PanelRightClose } from "lucide-react"
import { ChatMessageBubble } from "./chat-message-bubble"
import { ChatInput } from "./chat-input"

interface WorkspaceChatProps {
  projectId: string
}

type Message = {
  id: string
  role: 'user' | 'ai'
  content: string
}

const MOCK_CHAT: Message[] = [
  {
    id: '1',
    role: 'ai',
    content: "Hi there! I am your AI assistant for this workspace. How can I help you build your project today? \n\nYou can ask me to write code, debug issues, or plan architecture."
  }
]

export const WorkspaceChat = ({ projectId }: WorkspaceChatProps) => {
  const [messages, setMessages] = useState<Message[]>(MOCK_CHAT)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const handleSendMessage = (text: string) => {
    // Add user message
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text
    }

    setMessages(prev => [...prev, newMessage])

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'ai',
        content: `I received your message: \n\n\`\`\`text\n${text}\n\`\`\`\n\nI will process it shortly!`
      }
      setMessages(prev => [...prev, aiResponse])
    }, 1000)
  }

  return (
    <div className={`relative flex h-full shrink-0 flex-col bg-bg-main border-border-subtle transition-all duration-300 ${isCollapsed ? 'w-0 border-r-0' : 'w-[450px] border-r'}`}>

      {/* Floating Expand Button when Collapsed */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="absolute left-6 top-6 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-bg-card border border-border-subtle shadow-sm text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors"
          title="Open AI Chat"
        >
          <PanelRightClose size={20} />
        </button>
      )}

      {/* Main Chat Content (hidden completely when collapsed to prevent overflow) */}
      <div className={`flex h-full w-full flex-col overflow-hidden transition-opacity duration-300 ${isCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 py-3 bg-bg-card">
          <h2 className="text-[15px] font-semibold text-text-main flex items-center gap-2">
            Workspace AI
          </h2>
          <button
            onClick={() => setIsCollapsed(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-hover-bg hover:text-text-main transition-colors"
            title="Collapse AI Chat"
          >
            <PanelLeftClose size={20} />
          </button>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <ChatMessageBubble key={msg.id} role={msg.role} content={msg.content} />
          ))}
        </div>

        {/* Fixed bottom input container */}
        <div className="shrink-0 bg-transparent px-4 pb-4 pt-2">
          <ChatInput onSendMessage={handleSendMessage} />
        </div>
      </div>
    </div>
  )
}
