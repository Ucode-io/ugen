import { create } from 'zustand'

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
  pendingPrompt: { content: string, images?: string[], model?: string } | null
  setPendingPrompt: (prompt: { content: string, images?: string[], model?: string } | null) => void
  setChatId: (id: string | null) => void
  setProjectId: (id: string | null) => void
  addMessage: (message: Message) => void
  unshiftMessages: (messages: Message[]) => void
  setMessages: (messages: Message[]) => void
  updateMessage: (id: string, updated: Partial<Message>) => void
  clearChat: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  chatId: null,
  projectId: null,
  messages: [],
  pendingPrompt: null,
  setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),
  setChatId: (id) => set({ chatId: id }),
  setProjectId: (id) => set({ projectId: id }),
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
  clearChat: () => set({ chatId: null, projectId: null, messages: [], pendingPrompt: null }),
}))
