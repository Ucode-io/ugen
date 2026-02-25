import { create } from 'zustand'

interface GenerationSettings {
  prompt: string
  modelId: string
  ratio: '1:1' | '16:9' | '4:3'
  setPrompt: (text: string) => void
  setSettings: (settings: Partial<Omit<GenerationSettings, 'setPrompt' | 'setSettings'>>) => void
  reset: () => void
}

const initialState = {
  prompt: '',
  modelId: 'stable-diffusion-v1',
  ratio: '1:1' as const,
}

export const useGenerationStore = create<GenerationSettings>((set) => ({
  ...initialState,
  setPrompt: (prompt) => set({ prompt }),
  setSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
  reset: () => set(initialState),
}))
