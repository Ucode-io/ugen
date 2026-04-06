'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authApi } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Popover, PopoverContent, PopoverTrigger, Checkbox, MultiSelect } from '@/shared/ui'
import { cn } from '@/shared/lib/utils/cn'
import {
  Camera, ChevronDown, ChevronUp, Trash2, Loader2,
  Monitor, Smartphone, Globe, Shield, Save, User, Layers, Settings
} from 'lucide-react'
import { EnvironmentPage } from '@/widgets/project-workspace'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

const LanguageRow = ({ item, languageKeys, projectId, updateMutation, languages, setLanguages }: any) => {
  const [translations, setTranslations] = useState(item.translations || {})

  useEffect(() => {
    setTranslations(item.translations || {})
  }, [item.translations])

  const handleBlur = (code: string, value: string) => {
    if (item.translations?.[code] === value) return // No change

    const newTranslations = { ...translations, [code]: value }
    const updatedItem = { ...item, translations: newTranslations }

    // Update global store optimistically
    const nextLanguages = languages.map((l: any) => l.id === item.id ? updatedItem : l)
    setLanguages(nextLanguages)

    // Fire API request
    updateMutation.mutate(updatedItem)
  }

  return (
    <div className="flex items-center gap-6 py-3 border-b border-border-subtle/50 last:border-0 hover:bg-bg-sidebar/20 rounded-xl px-2 transition-colors">
      <div className="w-[180px] shrink-0">
        <span className="text-sm font-medium text-text-main">{item.key}:</span>
      </div>
      <div className="flex flex-1 gap-4 overflow-x-auto no-scrollbar">
        {languageKeys.map((code: string) => (
          <Input
            key={code}
            value={translations[code] || ''}
            onChange={(e) => setTranslations({ ...translations, [code]: e.target.value })}
            onBlur={(e) => handleBlur(code, e.target.value)}
            className="flex-1 min-w-[150px] bg-bg-main border-border-subtle h-10 rounded-xl"
            placeholder={code.toUpperCase()}
          />
        ))}
      </div>
    </div>
  )
}


export const AppSettingsPage = () => {
  const tCommon = useTranslations('widgets.common')
  const tWidgets = useTranslations('widgets.appSettings')
  const user = useAuthStore(s => s.user)
  const project = useAuthStore(s => s.project)
  const projectId = project?.project_id ?? ''
  const companyId = user?.company_id ?? ''
  const userId = user?.id ?? ''
  const environmentId = user?.environment_id ?? ''

  const languages = useAuthStore(s => s.languages) ?? []
  const setLanguages = useAuthStore(s => s.setLanguages)

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

  // Tabs State
  const [activeTab, setActiveTab] = useState('profile')
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [languagesLoading, setLanguagesLoading] = useState(false)
  const [projectLanguage, setProjectLanguage] = useState<any[]>([])
  const [projectTimezone, setProjectTimezone] = useState('')
  const [projectIconCat, setProjectIconCat] = useState<string[]>([])

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
    enabled: activeTab === 'sessions' && !!userId && !!projectId,
  })

  // Project Settings Queries
  const { data: projectLanguages = [], isLoading: isLoadingProjLangs } = useQuery({
    queryKey: ['project-settings-language', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v1/project/setting', {
        params: { 'project-id': projectId, type: 'LANGUAGE', limit: 200 }
      })
      return data?.data?.data?.language || []
    },
    enabled: activeTab === 'project' && !!projectId
  })

  const { data: projectTimezones = [], isLoading: isLoadingProjTime } = useQuery({
    queryKey: ['project-settings-timezone', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v1/project/setting', {
        params: { 'project-id': projectId, type: 'TIMEZONE', limit: 200 }
      })
      return data?.data?.data?.timezone || []
    },
    enabled: activeTab === 'project' && !!projectId
  })

  const { data: iconCollections = [], isLoading: isLoadingIcons } = useQuery({
    queryKey: ['icon-collections'],
    queryFn: async () => {
      const res = await fetch('https://api.iconify.design/collections')
      const data = await res.json()
      return Object.entries(data).map(([k, v]: any) => ({
        id: k,
        name: v.name,
        total: v.total
      }))
    },
    enabled: activeTab === 'project'
  })

  // Full Project Details Query
  const { data: fullProjectSettings, isLoading: isLoadingFullProject } = useQuery({
    queryKey: ['company-project', projectId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/company-project/${projectId}`, {
        params: { 'project-id': projectId }
      })
      return data?.data || {}
    },
    enabled: activeTab === 'project' && !!projectId
  })

  useEffect(() => {
    if (fullProjectSettings) {
      if (Array.isArray(fullProjectSettings.language)) {
        setProjectLanguage(fullProjectSettings.language)
      }
      if (fullProjectSettings.timezone_id) {
        setProjectTimezone(fullProjectSettings.timezone_id)
      }
      if (Array.isArray(fullProjectSettings.icon_categories)) {
        setProjectIconCat(fullProjectSettings.icon_categories)
      }
    }
  }, [fullProjectSettings])

  const updateProjectSettingsMutation = useMutation({
    mutationFn: async (updatedFields: any) => {
      if (!fullProjectSettings) return
      const payload = {
        ...fullProjectSettings,
        // Ensure required API fields from the response are passed
        project_id: projectId,
        company_id: companyId,
        ...updatedFields
      }

      const { data } = await api.put(`/v1/company-project/${projectId}`, payload, {
        params: { 'project-id': projectId }
      })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-project', projectId] })
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.description || 'Failed to update project settings')
    }
  })

  // Multiselect toggles
  const toggleLanguage = (lang: any, checked: boolean) => {
    const current = [...projectLanguage];
    if (checked) {
      const updated = [...current, { id: lang.id, label: lang.name }];
      setProjectLanguage(updated);
      updateProjectSettingsMutation.mutate({ language: updated });
    } else {
      const updated = current.filter(l => l.id !== lang.id);
      setProjectLanguage(updated);
      updateProjectSettingsMutation.mutate({ language: updated });
    }
  }

  const toggleIconCat = (colId: string, colName: string, checked: boolean) => {
    const val = `${colId}#${colName}`;
    const current = [...projectIconCat];
    if (checked) {
      if (!current.includes(val)) {
        const updated = [...current, val];
        setProjectIconCat(updated);
        updateProjectSettingsMutation.mutate({ icon_categories: updated });
      }
    } else {
      if (current.length <= 1) {
        toast.error('At least one icon category is required')
        return
      }
      const updated = current.filter(v => v !== val);
      setProjectIconCat(updated);
      updateProjectSettingsMutation.mutate({ icon_categories: updated });
    }
  }

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
  const groupedLanguages = useMemo(() => {
    return languages.reduce((acc: any, cur) => {
      const cat = cur.category || 'Other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(cur)
      return acc
    }, {})
  }, [languages])

  const languageKeys = useMemo(() => {
    const keys = new Set<string>()
    languages.forEach(l => {
      if (l.translations) {
        Object.keys(l.translations).forEach(k => keys.add(k))
      }
    })
    return Array.from(keys).sort((a, b) => {
      const order = ['en', 'ru', 'uz', 'cyr']
      const indexA = order.indexOf(a)
      const indexB = order.indexOf(b)
      if (indexA === -1 && indexB === -1) return a.localeCompare(b)
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      return indexA - indexB
    })
  }, [languages])

  const updateLanguageMutation = useMutation({
    mutationFn: async (updatedItem: any) => {
      const { data } = await api.put('/v1/language', updatedItem, {
        params: { 'project-id': projectId }
      })
      return data
    }
  })

  useEffect(() => {
    if (activeTab !== 'i18n') return
    if (languages.length > 0) return

    setLanguagesLoading(true)
    api.get('/v1/language?search=Admin')
      .then(res => {
        if (res.data?.data?.languages) {
          setLanguages(res.data.data.languages)
        }
      })
      .catch(err => console.error("Failed to load languages:", err))
      .finally(() => setLanguagesLoading(false))
  }, [activeTab, languages.length, setLanguages])

  return (
    <div className="flex flex-col w-full animate-in fade-in slide-in-from-bottom-4 duration-700 h-full overflow-hidden">
      <div className="mb-6 px-8 pt-7 shrink-0">
        <h1 className="text-[22px] font-[700] mb-1">Project Settings</h1>
        <p className="text-text-muted text-[13px]">Configure your project details and preferences</p>
      </div>

      <div className="flex gap-1 mb-5 border-b border-border-subtle pb-0 px-8 shrink-0">
        {[
          { id: 'profile', label: tWidgets('accountProfile'), icon: User },
          { id: 'project', label: 'Project Settings', icon: Settings },
          { id: 'sessions', label: tWidgets('loginSessions'), icon: Shield },
          { id: 'envs', label: tWidgets('environmentManagement'), icon: Layers },
          { id: 'i18n', label: tWidgets('languageKeys'), icon: Globe },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-4 py-2 border-none bg-transparent text-[13px] font-[500] cursor-pointer border-b-2 mb-[-1px] flex items-center gap-1.5 transition-colors",
              activeTab === tab.id
                ? "text-[#004eea] border-[#004eea]"
                : "text-text-muted border-transparent hover:text-text-main"
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-bg-card border border-border-subtle rounded-xl p-5 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-[14px] font-[600]">{tWidgets('accountProfile')}</h3>
              <Button
                onClick={() => saveMutation()}
                disabled={isSaving}
                className="rounded-lg px-4 py-1.5 h-8 text-[13px] font-[500] bg-[#004eea] hover:bg-[#393ce3] text-white border-none shadow-sm"
              >
                {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                {tWidgets('saveChanges')}
              </Button>
            </div>

            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-bg-sidebar border border-border-subtle">
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
                  className="absolute inset-0 rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center backdrop-blur-[2px]"
                >
                  <Camera size={24} className="text-white mb-1" />
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
                    setAvatarFile(file)
                    setAvatarPreview(URL.createObjectURL(file))
                  }}
                />
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 w-full">
                <div className="mb-4">
                  <label className="block text-[12px] font-[500] text-text-muted mb-1.5">{tWidgets('fullName')}</label>
                  <Input
                    placeholder={tWidgets('namePlaceholder')}
                    value={form.name}
                    onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-bg-sidebar border-border-subtle h-[38px] rounded-lg text-[13px] focus:border-[#004eea]"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-[12px] font-[500] text-text-muted mb-1.5">{tWidgets('emailAddress')}</label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={form.email}
                    onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                    className="w-full bg-bg-sidebar border-border-subtle h-[38px] rounded-lg text-[13px] focus:border-[#004eea]"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-[12px] font-[500] text-text-muted mb-1.5">{tWidgets('phoneNumber')}</label>
                  <Input
                    type="tel"
                    placeholder="+1 234 567 89 00"
                    value={form.phone}
                    onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                    className="w-full bg-bg-sidebar border-border-subtle h-[38px] rounded-lg text-[13px] focus:border-[#004eea]"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-[12px] font-[500] text-text-muted mb-1.5">{tWidgets('loginUsername')}</label>
                  <Input
                    placeholder="username"
                    value={form.login}
                    onChange={(e) => setForm(p => ({ ...p, login: e.target.value }))}
                    className="w-full bg-bg-sidebar border-border-subtle h-[38px] rounded-lg text-[13px] focus:border-[#004eea]"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-[12px] font-[500] text-text-muted mb-1.5">{tWidgets('accountType')}</label>
                  <div className="w-full bg-bg-sidebar rounded-lg px-3 py-2 text-[13px] border border-border-subtle text-text-muted cursor-not-allowed">
                    {typeof user?.role === 'string' ? user.role : 'User'}
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-[12px] font-[500] text-text-muted mb-1.5">{tWidgets('assignedRole')}</label>
                  <div className="w-full bg-bg-sidebar rounded-lg px-3 py-2 text-[13px] border border-border-subtle text-text-muted cursor-not-allowed">
                    {typeof user?.role === 'string' ? user.role : 'Member'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Project Settings Tab */}
        {activeTab === 'project' && (
          <div className="bg-bg-card border border-border-subtle rounded-xl p-5 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-[14px] font-[600]">Global Defaults</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="mb-4 flex flex-col">
                <label className="block text-[12px] font-[500] text-text-muted mb-1.5">Project Languages</label>
                <MultiSelect
                  options={projectLanguages.map((lang: any) => ({ label: `${lang.name} (${lang.short_name})`, value: lang.id }))}
                  selected={projectLanguage.map(l => l.id)}
                  onChange={(newSelected: string[]) => {
                    const updated = newSelected.map((val: string) => {
                      const lang = projectLanguages.find((l: any) => l.id === val);
                      return { id: lang.id, label: lang.name };
                    });
                    setProjectLanguage(updated);
                    updateProjectSettingsMutation.mutate({ language: updated });
                  }}
                  placeholder={isLoadingProjLangs || isLoadingFullProject ? 'Loading...' : 'Select languages'}
                />
              </div>

              <div className="mb-4 flex flex-col">
                <label className="block text-[12px] font-[500] text-text-muted mb-1.5">Timezone</label>
                <Select value={projectTimezone} onValueChange={(val) => { setProjectTimezone(val); updateProjectSettingsMutation.mutate({ timezone_id: val }); }}>
                  <SelectTrigger className="w-full bg-bg-sidebar border-border-subtle h-[38px] rounded-lg text-[13px] focus:border-[#004eea]">
                    <SelectValue placeholder={isLoadingProjTime || isLoadingFullProject ? 'Loading...' : 'Select timezone'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {projectTimezones.map((tz: any) => (
                      <SelectItem key={tz.id} value={tz.id} className="text-[13px]">
                        {tz.text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-4 flex flex-col">
                <label className="block text-[12px] font-[500] text-text-muted mb-1.5">Icon Categories</label>
                <MultiSelect
                  options={iconCollections.map((col: any) => ({ label: `${col.name} (${col.total} icons)`, value: `${col.id}#${col.name}` }))}
                  selected={projectIconCat}
                  onChange={(newSelected: string[]) => {
                    if (newSelected.length === 0) {
                      toast.error('At least one icon category is required')
                      return
                    }
                    setProjectIconCat(newSelected);
                    updateProjectSettingsMutation.mutate({ icon_categories: newSelected });
                  }}
                  placeholder={isLoadingIcons || isLoadingFullProject ? 'Loading...' : 'Select icon collections'}
                />
              </div>
            </div>
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="bg-bg-card border border-border-subtle rounded-xl p-5 mb-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3.5">
              <h3 className="text-[14px] font-[600]">{tWidgets('loginSessions')}</h3>
              {sessions.length > 0 && <span className="bg-[#004eea]/10 text-[#004eea] text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md">{sessions.length}</span>}
            </div>
            
            <div className="flex flex-col gap-2">
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
                  <div key={session.id} className="flex items-center gap-4 px-4 py-3 bg-bg-sidebar/30 border border-border-subtle rounded-xl hover:border-[#004eea]/50 transition-colors">
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
                      {deletingSessionId === session.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* I18N Tab */}
        {activeTab === 'i18n' && (
          <div className="bg-bg-card border border-border-subtle rounded-xl p-5 mb-4 shadow-sm">
            <h3 className="text-[14px] font-[600] mb-3.5">{tWidgets('languageKeys')}</h3>
            
            <div className="overflow-x-auto">
              {languagesLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 size={24} className="animate-spin text-primary/40" />
                  <p className="text-sm text-text-muted">{tWidgets('accessingLangDb')}</p>
                </div>
              ) : languages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Globe size={32} className="text-text-muted/20 mb-3" />
                  <p className="text-text-muted text-sm font-medium">{tWidgets('noLangKeys')}</p>
                </div>
              ) : (
                <div className="min-w-max space-y-6">
                  <div className="flex items-center gap-6 px-2 mb-2 border-b border-border-subtle pb-2">
                    <div className="w-[180px] shrink-0"></div>
                    <div className="flex flex-1 gap-4">
                      {languageKeys.map((code: string) => (
                        <div key={code} className="flex-1 min-w-[150px] text-center text-[12px] font-[500] text-text-muted uppercase tracking-widest">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  {Object.entries(groupedLanguages).map(([category, items]: [string, any]) => (
                    <div key={category} className="space-y-2">
                      <p className="text-[13px] font-[600] text-text-main px-2 mb-2">{category}</p>
                      <div className="space-y-1">
                        {items.map((item: any) => (
                          <LanguageRow
                            key={item.id}
                            item={item}
                            languageKeys={languageKeys}
                            projectId={projectId}
                            updateMutation={updateLanguageMutation}
                            languages={languages}
                            setLanguages={setLanguages}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Environments Tab */}
        {activeTab === 'envs' && (
          <div className="bg-bg-card border border-border-subtle rounded-xl p-5 mb-4 shadow-sm">
            <h3 className="text-[14px] font-[600] mb-3.5">{tWidgets('environmentManagement')}</h3>
            <EnvironmentPage projectId={projectId} />
          </div>
        )}
      </div>
    </div>
  )
}
