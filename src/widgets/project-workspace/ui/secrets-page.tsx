'use client'

import { useState, useMemo } from 'react'
import {
  Loader2,
  PlusCircle,
  Eye,
  EyeOff,
  Lock as LockIcon,
  Trash2,
  Edit,
  Check,
  Copy
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/shared/api'
import {
  Button,
  Input,

  DataLoadingState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/shared/ui'
import { WorkspaceDataTable } from './workspace-data-table'
import { useTranslations } from 'next-intl'

const SecretCell = ({ value }: { value: string }) => {
  const [show, setShow] = useState(false)
  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[13px] text-text-muted max-w-[400px] truncate">
        {show ? (value || '••••••••••••••••') : '••••••••••••••••'}
      </span>
      <button onClick={() => setShow(!show)} className="text-text-muted hover:text-primary transition-colors">
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  )
}

interface SecretsPageProps {
  projectId: string
}

export const SecretsPage = ({ projectId }: SecretsPageProps) => {
  const t = useTranslations('widgets.projectWorkspace')
  const [isSecretDialogOpen, setSecretDialogOpen] = useState(false)
  const [isSecretUpdateOpen, setSecretUpdateOpen] = useState(false)
  const [isSecretDeleteOpen, setSecretDeleteOpen] = useState(false)
  const [activeSecret, setActiveSecret] = useState<{ key: string; value: string } | null>(null)
  const [secretForm, setSecretForm] = useState({ key: '', value: '' })
  const [search, setSearch] = useState('')

  const queryClient = useQueryClient()

  const fetchSecrets = async () => {
    const { data } = await api.get('/v1/vault/keys')
    return (data?.data?.data ?? []) as { key: string; value: string }[]
  }

  const { data: vaultSecrets = [], isLoading } = useQuery({
    queryKey: ['vault-secrets'],
    queryFn: fetchSecrets
  })

  const createSecretMutation = useMutation({
    mutationFn: (payload: { key: string; value: string }) => api.post('/v1/vault/keys', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-secrets'] })
      setSecretDialogOpen(false)
      setSecretForm({ key: '', value: '' })
    }
  })

  const updateSecretMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => api.put(`/v1/vault/keys/${key}`, { value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-secrets'] })
      setSecretUpdateOpen(false)
      setActiveSecret(null)
      setSecretForm({ key: '', value: '' })
    }
  })

  const deleteSecretMutation = useMutation({
    mutationFn: (key: string) => api.delete(`/v1/vault/keys/${key}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vault-secrets'] })
      setSecretDeleteOpen(false)
      setActiveSecret(null)
    }
  })

  const secretColumns = useMemo(() => [
    {
      accessorKey: 'key',
      header: 'Key',
      cell: ({ row }: any) => <span className="font-mono text-[13px] text-text-main font-bold">{row.original.key}</span>
    },
    {
      accessorKey: 'environment',
      header: 'Environment',
      cell: () => (
        <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] font-bold uppercase tracking-wider">
          {t('production')}
        </span>
      )
    },
    {
      accessorKey: 'value',
      header: 'Value',
      cell: ({ row }: any) => <SecretCell value={row.original.value} />
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all"
            onClick={(e) => {
              e.stopPropagation()
              setActiveSecret(row.original)
              setSecretForm({ key: row.original.key, value: row.original.value })
              setSecretUpdateOpen(true)
            }}
          >
            <Edit size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive transition-all"
            onClick={(e) => {
              e.stopPropagation()
              setActiveSecret(row.original)
              setSecretDeleteOpen(true)
            }}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ], [])

  const filteredSecrets = vaultSecrets.filter(s =>
    s.key.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main tracking-tight">{t('secrets')}</h1>
          <p className="text-text-muted text-sm mt-1">{t('secretsSubtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            {/* <input
              placeholder="Search secrets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[280px] h-9 pl-4 pr-4 rounded-xl bg-bg-sidebar border border-border-subtle text-sm text-text-main placeholder:text-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              autoComplete='off'
            /> */}
          </div>
          <Button
            onClick={() => {
              setSecretForm({ key: '', value: '' })
              setSecretDialogOpen(true)
            }}
            className="bg-primary hover:bg-primary/90 text-white rounded-lg h-8 px-3 text-[13px] font-medium"
          >
            <PlusCircle size={14} className="mr-1.5" />
            {t('addSecret')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <DataLoadingState message="Loading secrets..." />
      ) : vaultSecrets.length > 0 ? (
        <WorkspaceDataTable
          columns={secretColumns}
          data={filteredSecrets}
        />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] bg-bg-card border border-dashed border-border-subtle rounded-2xl p-8 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-primary/5 p-4 rounded-full mb-4">
            <LockIcon size={32} className="text-primary/40" />
          </div>
          <h3 className="text-lg font-medium text-text-main">{t('noSecrets')}</h3>
          <p className="text-text-muted text-sm max-w-xs mt-1">{t('noSecretsVault')}</p>
        </div>
      )}

      {/* Dialogs for Secret CRUD */}
      <Dialog open={isSecretDialogOpen} onOpenChange={setSecretDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addVaultSecret')}</DialogTitle>
            <DialogDescription>{t('storeSensitiveHint')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Key</label>
              <Input
                placeholder={t('envVarName')}
                value={secretForm.key}
                className="rounded-xl border-border-subtle"
                onChange={(e) => setSecretForm(prev => ({ ...prev, key: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('environment')}</label>
              <Select value="production">
                <SelectTrigger className="rounded-xl border-border-subtle bg-bg-sidebar/50">
                  <SelectValue placeholder="production" />
                </SelectTrigger>
                <SelectContent className="bg-bg-card border-border-subtle">
                  <SelectItem value="production">{t('production')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('value')}</label>
              <Input
                type="password"
                placeholder="••••••••••••••••"
                value={secretForm.value}
                className="rounded-xl border-border-subtle"
                onChange={(e) => setSecretForm(prev => ({ ...prev, value: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSecretDialogOpen(false)} className="rounded-xl">{t('cancel')}</Button>
            <Button
              disabled={!secretForm.key || !secretForm.value || createSecretMutation.isPending}
              onClick={() => createSecretMutation.mutate(secretForm)}
              className="bg-primary text-white rounded-xl"
            >
              {createSecretMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSecretUpdateOpen} onOpenChange={setSecretUpdateOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Update Secret: {activeSecret?.key}</DialogTitle>
            <DialogDescription>{t('changeValueHint')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('newValue')}</label>
              <Input
                type="password"
                placeholder="••••••••••••••••"
                value={secretForm.value}
                className="rounded-xl border-border-subtle"
                onChange={(e) => setSecretForm(prev => ({ ...prev, value: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSecretUpdateOpen(false)} className="rounded-xl">{t('cancel')}</Button>
            <Button
              disabled={!secretForm.value || updateSecretMutation.isPending}
              onClick={() => updateSecretMutation.mutate({ key: activeSecret!.key, value: secretForm.value })}
              className="bg-primary text-white rounded-xl"
            >
              {updateSecretMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Value
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSecretDeleteOpen} onOpenChange={setSecretDeleteOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 size={20} />
              {t('deleteSecret')}
            </DialogTitle>
            <DialogDescription>
              {t('confirmDelete')} <span className="font-bold text-text-main">{activeSecret?.key}</span>?
              This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setSecretDeleteOpen(false)} className="rounded-xl">{t('cancel')}</Button>
            <Button
              variant="destructive"
              disabled={deleteSecretMutation.isPending}
              onClick={() => deleteSecretMutation.mutate(activeSecret!.key)}
              className="rounded-xl"
            >
              {deleteSecretMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
