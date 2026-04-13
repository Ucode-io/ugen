'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authApi } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { Button, Input, Dialog, DialogContent } from '@/shared/ui'
import {
  Camera, Trash2, Loader2,
  Monitor, Smartphone, Globe, Shield, Save, User, X
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

interface ProfileModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

export const ProfileModal = ({ isOpen, onOpenChange }: ProfileModalProps) => {
  const tWidgets = useTranslations('widgets.appSettings')
  const tCommon = useTranslations('widgets.common')

  const user = useAuthStore(s => s.user)
  const project = useAuthStore(s => s.project)
  const accessToken = useAuthStore(s => s.accessToken)
  const projectId = project?.project_id ?? ''
  const companyId = user?.company_id ?? ''
  const userId = user?.id ?? ''
  const environmentId = user?.environment_id ?? ''

  const bearerHeaders = { Authorization: `Bearer ${accessToken}` }

  const queryClient = useQueryClient()
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL ?? ''

  const [activeTab, setActiveTab] = useState<'profile' | 'sessions'>('profile')
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: typeof (user as any)?.name === 'string' ? (user as any).name : (typeof user?.login === 'string' ? user.login : ''),
    email: typeof user?.email === 'string' ? user.email : '',
    phone: typeof (user as any)?.phone === 'string' ? (user as any).phone : '',
    login: typeof user?.login === 'string' ? user.login : '',
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFilename, setAvatarFilename] = useState<string | null>(
    typeof (user as any)?.photo === 'string' ? (user as any).photo : null
  )
  const [avatarError, setAvatarError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setForm({
        name: typeof (user as any)?.name === 'string' ? (user as any).name : (typeof user?.login === 'string' ? user.login : ''),
        email: typeof user?.email === 'string' ? user.email : '',
        phone: typeof (user as any)?.phone === 'string' ? (user as any).phone : '',
        login: typeof user?.login === 'string' ? user.login : '',
      })
      setAvatarFilename(typeof (user as any)?.photo === 'string' ? (user as any).photo : null)
      setAvatarPreview(null)
      setAvatarFile(null)
      setAvatarError(false)
    }
  }, [isOpen, user])

  const uploadPhoto = async (file: File, projectId: string): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/v1/upload', formData, {
      params: { 'project-id': projectId },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data.data.filename as string
  }

  const updateUser = (projectId: string, payload: Record<string, any>) =>
    authApi.put('/v2/user', payload, {
      params: { 'project-id': projectId },
      headers: bearerHeaders,
    })

  const fetchSessions = async (userId: string, projectId: string) => {
    const { data } = await authApi.get('/v2/session', {
      params: {
        user_id: userId,
        limit: 50,
        offset: 0,
        'project-id': projectId,
      },
      headers: bearerHeaders,
    })
    return data.data?.sessions ?? []
  }

  const deleteSession = (sessionId: string, projectId: string) =>
    authApi.delete(`/v2/session/${sessionId}`, {
      params: { 'project-id': projectId },
      headers: bearerHeaders,
    })

  const { data: sessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['sessions', userId, projectId],
    queryFn: () => fetchSessions(userId, projectId),
    enabled: activeTab === 'sessions' && !!userId && !!projectId && isOpen,
  })

  const { mutate: saveMutation, isPending: isSaving } = useMutation({
    mutationFn: async () => {
      let filename = avatarFilename
      if (avatarFile) {
        filename = await uploadPhoto(avatarFile, projectId)
        setAvatarFilename(filename)
        setAvatarFile(null)
      }
      await updateUser(projectId, {
        id: userId,
        login: form.login,
        name: form.name,
        email: form.email,
        phone: form.phone,
        company_id: companyId,
        project_id: projectId,
        environment_id: environmentId,
        ...(filename ? { photo: filename } : {}),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] })
      toast.success(tWidgets('saveChanges'))
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.description || 'Failed to save profile')
    }
  })

  const tabs = [
    { id: 'profile' as const, label: tWidgets('accountProfile') },
    { id: 'sessions' as const, label: tWidgets('loginSessions') },
  ]

  const userInitial = user?.login?.[0]?.toUpperCase() || 'U'

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full p-0 gap-0 overflow-hidden rounded-xl">
        {/* Modal Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle">
          <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-bold">
            {avatarPreview || avatarFilename ? (
              !avatarError ? (
                <img
                  src={avatarPreview ?? `${cdnBase}/${avatarFilename}`}
                  alt="avatar"
                  className="w-10 h-10 rounded-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : userInitial
            ) : userInitial}
          </div>
          <div>
            <h2 className="text-text-main text-base font-bold">{user?.login || 'User'}</h2>
            <p className="text-text-muted text-xs">{user?.email || ''}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-subtle px-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-1 mr-6 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] custom-scrollbar">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Avatar & Name */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-bg-sidebar border border-border-subtle">
                    {(avatarPreview || avatarFilename) && !avatarError ? (
                      <img
                        src={avatarPreview ?? `${cdnBase}/${avatarFilename}`}
                        alt="avatar"
                        className="w-full h-full object-cover"
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/5">
                        <User size={32} className="text-primary/40" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-[2px]"
                  >
                    <Camera size={20} className="text-white mb-1" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-tight">{tCommon('upload')}</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setAvatarError(false)
                      setAvatarFile(file)
                      setAvatarPreview(URL.createObjectURL(file))
                    }}
                  />
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <div>
                    <label className="block text-[12px] font-[500] text-text-muted mb-1.5">{tWidgets('fullName')}</label>
                    <Input
                      placeholder={tWidgets('namePlaceholder')}
                      value={form.name}
                      onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full bg-bg-sidebar border-border-subtle h-9 rounded-lg text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[500] text-text-muted mb-1.5">{tWidgets('emailAddress')}</label>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      value={form.email}
                      onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                      className="w-full bg-bg-sidebar border-border-subtle h-9 rounded-lg text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[500] text-text-muted mb-1.5">{tWidgets('phoneNumber')}</label>
                    <Input
                      type="tel"
                      placeholder="+1 234 567 89 00"
                      value={form.phone}
                      onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                      className="w-full bg-bg-sidebar border-border-subtle h-9 rounded-lg text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[500] text-text-muted mb-1.5">{tWidgets('loginUsername')}</label>
                    <Input
                      placeholder="username"
                      value={form.login}
                      onChange={(e) => setForm(p => ({ ...p, login: e.target.value }))}
                      className="w-full bg-bg-sidebar border-border-subtle h-9 rounded-lg text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-[500] text-text-muted mb-1.5">{tWidgets('accountType')}</label>
                    <div className="w-full bg-bg-sidebar rounded-lg px-3 py-2 text-[13px] border border-border-subtle text-text-muted cursor-not-allowed h-9 flex items-center">
                      {typeof user?.role === 'string' ? user.role : 'User'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-[500] text-text-muted mb-1.5">{tWidgets('assignedRole')}</label>
                    <div className="w-full bg-bg-sidebar rounded-lg px-3 py-2 text-[13px] border border-border-subtle text-text-muted cursor-not-allowed h-9 flex items-center">
                      {typeof user?.role === 'string' ? user.role : 'Member'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => saveMutation()}
                  disabled={isSaving}
                  className="h-9 px-5 rounded-lg text-[13px] font-medium bg-primary hover:bg-primary/90 text-white shadow-sm"
                >
                  {isSaving ? <Loader2 size={15} className="animate-spin mr-2" /> : <Save size={15} className="mr-2" />}
                  {tWidgets('saveChanges')}
                </Button>
              </div>
            </div>
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-[14px] font-[600]">{tWidgets('loginSessions')}</h3>
                {sessions.length > 0 && (
                  <span className="bg-primary/10 text-primary text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md">
                    {sessions.length}
                  </span>
                )}
              </div>

              {sessionsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 size={24} className="animate-spin text-primary/40" />
                  <p className="text-sm text-text-muted font-medium">{tWidgets('verifyingSessions')}</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-12">
                  <Shield size={32} className="text-text-muted/20 mx-auto mb-3" />
                  <p className="text-text-muted text-sm">{tWidgets('noSessions')}</p>
                </div>
              ) : (
                sessions.map((session: any) => (
                  <div
                    key={session.id}
                    className="flex items-center gap-4 px-4 py-3 bg-bg-sidebar/30 border border-border-subtle rounded-xl hover:border-primary/30 transition-colors"
                  >
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-bg-sidebar border border-border-subtle flex items-center justify-center">
                      {session.data?.toLowerCase().includes('mobile')
                        ? <Smartphone size={16} className="text-text-muted" />
                        : <Monitor size={16} className="text-text-muted" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-text-main font-medium truncate">{session.data || tWidgets('unknownDevice')}</p>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                        <span className="flex items-center gap-1"><Globe size={10} /> {session.ip}</span>
                        <span className="w-1 h-1 rounded-full bg-border-subtle shrink-0" />
                        <span>{new Date(session.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      disabled={deletingSessionId === session.id}
                      onClick={async () => {
                        setDeletingSessionId(session.id)
                        try {
                          await deleteSession(session.id, projectId)
                          await refetchSessions()
                        } finally {
                          setDeletingSessionId(null)
                        }
                      }}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      {deletingSessionId === session.id
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Trash2 size={16} />}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
