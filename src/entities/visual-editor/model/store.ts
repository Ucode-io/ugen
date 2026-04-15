import { create } from 'zustand'

interface SelectedElement {
  id: string
  tagName: string
  className?: string
  htmlId?: string
  dataName?: string
  domPath?: string
  textContent?: string
  sourceFile?: string | null
  sourceLine?: number | null
  outerHTML?: string | null
}

interface VisualEditorStore {
  isInspectMode: boolean
  selectedElements: SelectedElement[]
  setInspectMode: (mode: boolean) => void
  addSelectedElement: (element: SelectedElement) => void
  removeSelectedElement: (id: string) => void
  clearSelectedElements: () => void
}

export const useVisualEditorStore = create<VisualEditorStore>((set) => ({
  isInspectMode: false,
  selectedElements: [],
  setInspectMode: (mode) => set({ isInspectMode: mode }),
  addSelectedElement: (element) => set((state) => {
    // Check if element is already selected to avoid duplicates
    if (state.selectedElements.some(el => el.id === element.id)) return state
    return { selectedElements: [...state.selectedElements, element] }
  }),
  removeSelectedElement: (id) => set((state) => ({
    selectedElements: state.selectedElements.filter(el => el.id !== id)
  })),
  clearSelectedElements: () => set({ selectedElements: [] }),
}))
