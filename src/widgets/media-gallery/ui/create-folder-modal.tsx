'use client'

import React, { useState, useEffect } from 'react'
import { FolderPlus, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
} from '@/shared/ui'
import { useCreateMenuFolder } from '@/entities/menu'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'

interface CreateFolderModalProps {
  isOpen: boolean
  onClose: () => void
  parentId: string
  onSuccess?: () => void
}

export const CreateFolderModal = ({
  isOpen,
  onClose,
  parentId,
  onSuccess,
}: CreateFolderModalProps) => {
  const t = useTranslations('widgets.mediaGallery')
  const [name, setName] = useState('')
  const { mutate: createFolder, isPending } = useCreateMenuFolder()

  useEffect(() => {
    if (!isOpen) setName('')
  }, [isOpen])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const label = name.trim()
    if (!label) {
      toast.error(t('folderNameRequired'))
      return
    }
    if (!parentId) {
      toast.error(t('parentFolderMissing'))
      return
    }
    createFolder(
      { label, parent_id: parentId },
      {
        onSuccess: () => {
          toast.success(t('folderCreated'))
          onSuccess?.()
          onClose()
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.description || 'Failed to create folder')
        },
      },
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="bg-bg-card max-w-[440px] overflow-hidden rounded-[20px] border-white/5 p-6 shadow-2xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-text-main flex items-center gap-2 text-lg font-bold tracking-tight">
            <FolderPlus className="text-primary h-5 w-5" />
            {t('newFolder')}
          </DialogTitle>
          <DialogDescription className="text-text-muted text-[13px]">
            {t('createFolderHint')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('folderNamePlaceholder')}
            disabled={isPending}
          />

          <DialogFooter className="mt-6 flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
              className="flex-1"
            >
              {t('cancelBtn')}
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isPending}
              className="bg-primary hover:bg-primary/90 flex-1 text-white"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('creating')}
                </>
              ) : (
                <>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  {t('create')}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
