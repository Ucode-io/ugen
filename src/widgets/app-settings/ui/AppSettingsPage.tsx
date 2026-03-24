'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authApi } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { Button } from '@/shared/ui/ui/button'
import { Input } from '@/shared/ui/ui/input'
import { cn } from '@/shared/lib/utils/cn'
import {
  Camera, ChevronDown, ChevronUp, Trash2, Loader2,
  Monitor, Smartphone, Globe, Shield, Save, User
} from 'lucide-react'

// Profile Section Component
export const AppSettingsPage = () => {
  const user = useAuthStore(s => s.user)
  const project = useAuthStore(s => s.project)
  const projectId = project?.project_id ?? ''
  const companyId = user?.company_id ?? ''
  const userId = user?.id ?? ''
  const environmentId = user?.environment_id ?? ''

  const queryClient = useQueryClient()
  const cdnBase = process.env.NEXT_PUBLIC_CDN_BASE_URL ?? ''

  // Profile States
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Sessions States
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

  // Languages States
  const [languagesOpen, setLanguagesOpen] = useState(false)
  const [langFields, setLangFields] = useState<any[]>([])
  const [langLoading, setLangLoading] = useState(false)

  // API Functions
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
      params: { 'project-id': projectId }
    })

  const fetchSessions = async (userId: string, projectId: string) => {
    const { data } = await authApi.get('/v2/session', {
      params: {
        user_id: userId,
        limit: 50,
        offset: 0,
        'project-id': projectId,
      }
    })
    return data.data?.sessions ?? []
  }

  const deleteSession = (sessionId: string, projectId: string) =>
    authApi.delete(`/v2/session/${sessionId}`, {
      params: { 'project-id': projectId }
    })

  // Queries & Mutations
  const { data: sessions = [], isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['sessions', userId, projectId],
    queryFn: () => fetchSessions(userId, projectId),
    enabled: sessionsOpen && !!userId && !!projectId,
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
      // Potentially update global auth store if name/photo changed
      queryClient.invalidateQueries({ queryKey: ['current-user'] })
    }
  })

  // Language Keys logic
  useEffect(() => {
    if (!languagesOpen) return
    setLangLoading(true)
    try {
      import('@/shared/lib/i18n').then(() => {
        // Assuming there might be a DB utility elsewhere if it's not at the requested path
        // For now, using a stub as per request if the module is missing
        setLangLoading(false)
      }).catch(() => setLangLoading(false))
    } catch {
      setLangLoading(false)
    }
  }, [languagesOpen])

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-3xl">
      
      {/* 1. Profile Block */}
      <div className="bg-bg-card border border-border-subtle rounded-3xl p-8 space-y-8 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-main">Account Profile</h2>
          <Button
            onClick={() => saveMutation()}
            disabled={isSaving}
            className="rounded-xl px-6 h-10 shadow-sm"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            Save Changes
          </Button>
        </div>

        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Avatar Area */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-bg-sidebar border-2 border-border-subtle ring-4 ring-bg-main">
              {avatarPreview || avatarFilename ? (
                <img
                  src={avatarPreview ?? `${cdnBase}/${avatarFilename}`}
                  alt="avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/5">
                  <User size={36} className="text-primary/40" />
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-3xl bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-[2px]"
            >
              <Camera size={24} className="text-white mb-1" />
              <span className="text-[10px] font-bold text-white uppercase tracking-tight">Upload</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setAvatarFile(file)
                setAvatarPreview(URL.createObjectURL(file))
              }}
            />
          </div>

          {/* Form Fields Area */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 w-full">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Full Name</label>
              <Input
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle h-12 rounded-xl focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Email Address</label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Phone Number</label>
              <Input
                type="tel"
                placeholder="+1 234 567 89 00"
                value={form.phone}
                onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Login / Username</label>
              <Input
                placeholder="username"
                value={form.login}
                onChange={(e) => setForm(p => ({ ...p, login: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Account Type</label>
              <div className="bg-bg-sidebar rounded-xl px-4 py-3 text-sm border border-border-subtle text-text-muted cursor-not-allowed">
                {typeof user?.role === 'string' ? user.role : 'User'}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Assigned Role</label>
              <div className="bg-bg-sidebar rounded-xl px-4 py-3 text-sm border border-border-subtle text-text-muted cursor-not-allowed">
                {typeof user?.role === 'string' ? user.role : 'Member'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Sessions Accordion */}
      <div className="bg-bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
        <button
          onClick={() => setSessionsOpen(p => !p)}
          className="w-full flex items-center justify-between px-8 py-6 hover:bg-bg-sidebar/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
              <Shield size={20} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="font-bold text-text-main">Login Sessions</p>
              <p className="text-xs text-text-muted mt-0.5">Manage your active sessions and connected devices.</p>
            </div>
            {sessions.length > 0 && (
              <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full ml-2">
                {sessions.length}
              </span>
            )}
          </div>
          {sessionsOpen ? <ChevronUp size={20} className="text-text-muted" /> : <ChevronDown size={20} className="text-text-muted" />}
        </button>

        {sessionsOpen && (
          <div className="border-t border-border-subtle divide-y divide-border-subtle/50 max-h-[400px] overflow-y-auto custom-scrollbar">
            {sessionsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 size={24} className="animate-spin text-primary/40" />
                <p className="text-sm text-text-muted font-medium">Verifying active sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <Shield size={32} className="text-text-muted/20 mx-auto mb-3" />
                <p className="text-text-muted text-sm">No active sessions detected.</p>
              </div>
            ) : (
              sessions.map((session: any) => (
                <div key={session.id} className="flex items-center gap-4 px-8 py-4 hover:bg-bg-sidebar/30 transition-colors">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-bg-sidebar border border-border-subtle flex items-center justify-center shadow-sm">
                    {session.data?.toLowerCase().includes('mobile')
                      ? <Smartphone size={16} className="text-text-muted" />
                      : <Monitor size={16} className="text-text-muted" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-text-main font-medium truncate">{session.data || 'Unknown Device'}</p>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-text-muted">
                      <span className="flex items-center gap-1">
                        <Globe size={10} /> {session.ip}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-border-subtle shrink-0" />
                      <span>{new Date(session.created_at).toLocaleDateString()}</span>
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tight",
                        session.is_changed
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-green-500/10 text-green-600"
                      )}>
                        {session.is_changed ? 'Modified' : 'Secure'}
                      </span>
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
                    className="h-9 w-9 flex items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 transition-all group"
                    title="Terminate session"
                  >
                    {deletingSessionId === session.id
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Trash2 size={16} className="transition-transform group-hover:scale-110" />}
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 3. Languages Accordion */}
      <div className="bg-bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
        <button
          onClick={() => setLanguagesOpen(p => !p)}
          className="w-full flex items-center justify-between px-8 py-6 hover:bg-bg-sidebar/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
              <Globe size={20} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="font-bold text-text-main">Language Keys</p>
              <p className="text-xs text-text-muted mt-0.5">Explore available translations and localization keys.</p>
            </div>
          </div>
          {languagesOpen ? <ChevronUp size={20} className="text-text-muted" /> : <ChevronDown size={20} className="text-text-muted" />}
        </button>

        {languagesOpen && (
          <div className="border-t border-border-subtle p-6">
            {langLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 size={24} className="animate-spin text-primary/40" />
                <p className="text-sm text-text-muted">Accessing localization database...</p>
              </div>
            ) : langFields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe size={32} className="text-text-muted/20 mb-3" />
                <p className="text-text-muted text-sm font-medium">No localization keys indexed</p>
                <p className="text-xs text-text-muted mt-1 opacity-60">Try refreshing or syncing your translations.</p>
              </div>
            ) : (
              <div className="divide-y divide-border-subtle/50 max-h-[500px] overflow-y-auto custom-scrollbar">
                {langFields.map((category: any, catIdx: number) => (
                  <div key={catIdx} className="py-4">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3 px-2">
                      {category.key}
                    </p>
                    <div className="space-y-2">
                      {category.values?.map((item: any, idx: number) => (
                        <div key={idx} className="flex bg-bg-sidebar/30 border border-border-subtle/40 rounded-xl p-3 items-center gap-4 text-sm group hover:border-primary/20 transition-colors">
                          <code className="text-text-muted font-mono text-[11px] w-48 shrink-0 truncate bg-bg-sidebar px-2 py-0.5 rounded-md border border-border-subtle/50">
                            {item.key}
                          </code>
                          <div className="flex flex-1 gap-4 overflow-x-auto no-scrollbar">
                            {item.translations && Object.entries(item.translations).map(([lang, val]: [string, any]) => (
                              <div key={lang} className="flex flex-col gap-0.5 min-w-[140px]">
                                <span className="text-[9px] font-bold text-text-muted/60 uppercase tracking-tighter">{lang}</span>
                                <span className="text-text-main text-xs font-medium truncate">{val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}
