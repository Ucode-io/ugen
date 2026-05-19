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

export interface SseEvent<T = any> {
  type: string
  message?: string
  value?: string
  icon?: string
  percent?: number
  data?: T
}

interface ChatState {
  chatId: string | null
  projectId: string | null
  messages: Message[]
  chatWidth: number
  chatPosition: ChatPosition
  isStreaming: boolean
  pendingScreenshot: boolean
  sseEvents: SseEvent[]
  // Last error reported by the SSE stream (event.type === 'error'). Surfaced
  // in the preview area so first-generation failures show an actionable UI
  // instead of leaving the AI animation spinning forever.
  streamError: string | null
  pendingPrompt: {
    content: string
    images?: string[]
    model?: string
    context?: Array<{ path?: string | null; line?: number | string | null; element?: string | null }>
  } | null
  setPendingPrompt: (prompt: {
    content: string
    images?: string[]
    model?: string
    context?: Array<{ path?: string | null; line?: number | string | null; element?: string | null }>
  } | null) => void
  setChatPosition: (position: ChatPosition) => void
  setChatId: (id: string | null) => void
  setProjectId: (id: string | null) => void
  setIsStreaming: (isStreaming: boolean) => void
  setStreamError: (error: string | null) => void
  setPendingScreenshot: (pendingScreenshot: boolean) => void
  addMessage: (message: Message) => void
  unshiftMessages: (messages: Message[]) => void
  setMessages: (messages: Message[]) => void
  updateMessage: (id: string, updated: Partial<Message>) => void
  setChatWidth: (width: number) => void
  clearChat: () => void
  addSseEvent: (event: SseEvent) => void
  clearSseEvents: () => void
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
      isStreaming: false,
      pendingScreenshot: false,
      sseEvents: [],
      streamError: null,
      addSseEvent: (event) => set((state) => ({ sseEvents: [...state.sseEvents, event] })),
      clearSseEvents: () => set({ sseEvents: [] }),
      setChatId: (id) => set({ chatId: id }),
      setProjectId: (id) => set({ projectId: id }),
      setChatPosition: (position) => set({ chatPosition: position }),
      setPendingPrompt: (prompt) => set({ pendingPrompt: prompt }),
      setIsStreaming: (isStreaming) => set({ isStreaming }),
      setStreamError: (streamError) => set({ streamError }),
      setPendingScreenshot: (pendingScreenshot) => set({ pendingScreenshot }),
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
      partialize: (state) => ({ chatWidth: state.chatWidth, chatPosition: state.chatPosition }),
    }
  )
)
