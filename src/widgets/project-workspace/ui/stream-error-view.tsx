'use client'
import { AlertTriangle, RotateCcw } from "lucide-react"

interface StreamErrorViewProps {
  message: string
  onRetry: () => void
  isRetrying?: boolean
}

export const StreamErrorView = ({ message, onRetry, isRetrying }: StreamErrorViewProps) => {
  return (
    <div className="flex-1 flex items-center justify-center bg-bg-main bg-[url('/grid.svg')] dark:bg-[url('/grid-dark.svg')] bg-center px-4">
      <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-text-main">
          Generation failed
        </h2>
        <div className="bg-bg-card border border-border-subtle rounded-lg p-4 text-left">
          <pre className="font-mono text-xs text-red-500 whitespace-pre-wrap break-words max-h-40 overflow-auto">
            {message}
          </pre>
        </div>
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="bg-primary hover:bg-primary/90 active:bg-primary/80 disabled:opacity-60 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors"
        >
          <RotateCcw size={14} className={isRetrying ? 'animate-spin' : ''} />
          {isRetrying ? 'Retrying...' : 'Retry'}
        </button>
      </div>
    </div>
  )
}
