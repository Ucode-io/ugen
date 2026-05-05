'use client'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/shared/ui'
import { useSaveFlowStore } from '../model/save-flow-store'

export const UnsavedChangesModal = () => {
  const open = useSaveFlowStore((s) => s.unsavedOpen)
  const params = useSaveFlowStore((s) => s.unsavedParams)
  const close = useSaveFlowStore((s) => s.closeUnsavedModal)

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-main">
            <AlertTriangle size={16} className="text-amber-500" />
            Unsaved changes
          </DialogTitle>
          <DialogDescription className="text-text-muted text-xs">
            You have unsaved changes in {params?.files.length ?? 0} file
            {(params?.files.length ?? 0) === 1 ? '' : 's'}. Continuing will lose them unless you save first.
          </DialogDescription>
        </DialogHeader>

        {params && params.files.length > 0 && (
          <div className="max-h-40 overflow-y-auto rounded-lg border border-border-subtle bg-bg-sidebar/50 p-2 space-y-0.5">
            {params.files.map((f) => (
              <div key={f.path} className="text-[11px] font-mono text-text-muted truncate">
                {f.path}
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <button
            type="button"
            onClick={close}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-text-muted hover:text-text-main hover:bg-hover-bg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => params?.onDiscard()}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-red-500 border border-red-500/30 hover:bg-red-500/5 transition-colors"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={() => params?.onSave()}
            className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
