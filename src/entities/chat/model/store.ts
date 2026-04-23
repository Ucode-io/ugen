import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ChatPosition = 'left' | 'right'

export type Message = {
  id: string
  role: 'user' | 'ai' | 'assistant'
  content: string
  type?: 'text' | 'audio'
  audioUrl?: string
  isFromResponse?: boolean
  images?: string[]
  pending_action?: any
  bpmnXml?: string
  plan?: any
}

interface ChatState {
  chatId: string | null
  projectId: string | null
  messages: Message[]
  chatWidth: number
  chatPosition: ChatPosition
  pendingPrompt: { content: string, images?: string[], model?: string } | null
  setPendingPrompt: (prompt: { content: string, images?: string[], model?: string } | null) => void
  setChatPosition: (position: ChatPosition) => void
  setChatId: (id: string | null) => void
  setProjectId: (id: string | null) => void
  addMessage: (message: Message) => void
  unshiftMessages: (messages: Message[]) => void
  setMessages: (messages: Message[]) => void
  updateMessage: (id: string, updated: Partial<Message>) => void
  setChatWidth: (width: number) => void
  clearChat: () => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      chatId: null,
      projectId: null,
      messages: [],
      chatWidth: 360,
      pendingPrompt: null,
      chatPosition: 'left',
      setChatId: (id) => set({ chatId: id }),
      setProjectId: (id) => set({ projectId: id }),
      setChatPosition: (position) => set({ chatPosition: position }),
      setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      unshiftMessages: (newMessages) => set((state) => {
        const existingIds = new Set(state.messages.map(m => m.id))
        const filtered = newMessages.filter(m => !existingIds.has(m.id))
        return { messages: [...filtered, ...state.messages] }
      }),
      setMessages: (messages) => set({ messages }),
      updateMessage: (id, updated) => set((state) => ({
        messages: state.messages.map(m => m.id === id ? { ...m, ...updated } : m)
      })),
      setChatWidth: (width) => set({ chatWidth: width }),
      clearChat: () => set({ chatId: null, projectId: null, messages: [], pendingPrompt: null }),
    }),
    {
      name: 'chat-storage',
      partialize: (state) => ({ chatWidth: state.chatWidth }),
    }
  )
)
