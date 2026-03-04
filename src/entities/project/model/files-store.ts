import { create } from 'zustand'

export interface IFile {
  path: string
  content: string
  language: string
}

const mockFiles: IFile[] = [
  {
    path: 'package.json',
    language: 'json',
    content: `{\n  "name": "project",\n  "version": "1.0.0",\n  "dependencies": {\n    "react": "^18.2.0",\n    "react-dom": "^18.2.0",\n    "lucide-react": "latest"\n  }\n}\n`
  },
  {
    path: 'src/index.css',
    language: 'css',
    content: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\nhtml, body, #root {\n  height: 100%;\n  margin: 0;\n  padding: 0;\n}\n`
  },
  {
    path: 'src/App.jsx',
    language: 'javascript',
    content: `import React, { useState } from 'react';\nimport { Rocket } from 'lucide-react';\nimport './index.css';\n\nexport default function App() {\n  const [count, setCount] = useState(0);\n  return (\n    <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white">\n      <Rocket size={48} className="text-blue-400 mb-4" />\n      <h1 className="text-4xl font-bold mb-4">Hello Udevs</h1>\n      <button \n        className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-medium transition-colors"\n        onClick={() => setCount(count + 1)}\n      >\n        Count: {count}\n      </button>\n    </div>\n  );\n}\n`
  }
]

interface FilesState {
  files: IFile[]
  setFiles: (files: IFile[]) => void
  updateFile: (path: string, content: string) => void
}

export const useFilesStore = create<FilesState>((set) => ({
  files: mockFiles,
  setFiles: (files) => set({ files }),
  updateFile: (path, content) =>
    set((state) => ({
      files: state.files.map((f) => (f.path === path ? { ...f, content } : f))
    }))
}))
