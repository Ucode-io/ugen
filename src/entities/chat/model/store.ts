import { create } from 'zustand'

export type Message = {
  id: string
  role: 'user' | 'ai' | 'assistant'
  content: string
  type?: 'text' | 'audio'
  audioUrl?: string
}

interface ChatState {
  chatId: string | null
  messages: Message[]
  setChatId: (id: string | null) => void
  addMessage: (message: Message) => void
  unshiftMessages: (messages: Message[]) => void
  setMessages: (messages: Message[]) => void
  clearChat: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  chatId: null,
  messages: [],
  setChatId: (id) => set({ chatId: id }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  unshiftMessages: (newMessages) => set((state) => {
    const existingIds = new Set(state.messages.map(m => m.id))
    const filtered = newMessages.filter(m => !existingIds.has(m.id))
    return { messages: [...filtered, ...state.messages] }
  }),
  setMessages: (messages) => set({ messages }),
  clearChat: () => set({ chatId: null, messages: [] }),
}))
