'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, authApi } from '@/shared/api'
import { useAuthStore } from '@/entities/session'
import { Button, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Popover, PopoverContent, PopoverTrigger, Checkbox } from '@/shared/ui'
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

  // Sessions States
  const [sessionsOpen, setSessionsOpen] = useState(false)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

  // Languages States
  const [languagesOpen, setLanguagesOpen] = useState(false)
  const [languagesLoading, setLanguagesLoading] = useState(false)

  // Environment States
  const [environmentOpen, setEnvironmentOpen] = useState(false)

  // Project Settings States
  const [projectSettingsOpen, setProjectSettingsOpen] = useState(false)
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
    enabled: sessionsOpen && !!userId && !!projectId,
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
    enabled: projectSettingsOpen && !!projectId
  })

  const { data: projectTimezones = [], isLoading: isLoadingProjTime } = useQuery({
    queryKey: ['project-settings-timezone', projectId],
    queryFn: async () => {
      const { data } = await api.get('/v1/project/setting', {
        params: { 'project-id': projectId, type: 'TIMEZONE', limit: 200 }
      })
      return data?.data?.data?.timezone || []
    },
    enabled: projectSettingsOpen && !!projectId
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
    enabled: projectSettingsOpen
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
    enabled: projectSettingsOpen && !!projectId
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
    if (!languagesOpen) return
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
  }, [languagesOpen, languages.length, setLanguages])

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-3xl">

      {/* 1. Profile Block */}
      <div className="bg-bg-card border border-border-subtle rounded-3xl p-8 space-y-8 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-main">{tWidgets('accountProfile')}</h2>
          <Button
            onClick={() => saveMutation()}
            disabled={isSaving}
            className="rounded-xl px-6 h-10 shadow-sm"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
            {tWidgets('saveChanges')}
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

          {/* Form Fields Area */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 w-full">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{tWidgets('fullName')}</label>
              <Input
                placeholder={tWidgets('namePlaceholder')}
                value={form.name}
                onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle h-12 rounded-xl focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{tWidgets('emailAddress')}</label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{tWidgets('phoneNumber')}</label>
              <Input
                type="tel"
                placeholder="+1 234 567 89 00"
                value={form.phone}
                onChange={(e) => setForm(p => ({ ...p, phone: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{tWidgets('loginUsername')}</label>
              <Input
                placeholder="username"
                value={form.login}
                onChange={(e) => setForm(p => ({ ...p, login: e.target.value }))}
                className="bg-bg-sidebar border-border-subtle h-12 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{tWidgets('accountType')}</label>
              <div className="bg-bg-sidebar rounded-xl px-4 py-3 text-sm border border-border-subtle text-text-muted cursor-not-allowed">
                {typeof user?.role === 'string' ? user.role : 'User'}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{tWidgets('assignedRole')}</label>
              <div className="bg-bg-sidebar rounded-xl px-4 py-3 text-sm border border-border-subtle text-text-muted cursor-not-allowed">
                {typeof user?.role === 'string' ? user.role : 'Member'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Project Settings Accordion */}
      <div className="bg-bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
        <button
          onClick={() => setProjectSettingsOpen(p => !p)}
          className="w-full flex items-center justify-between px-8 py-6 hover:bg-bg-sidebar/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
              <Settings size={20} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="font-bold text-text-main">Project Settings</p>
              <p className="text-xs text-text-muted mt-0.5">Configure language, timezone, and global defaults</p>
            </div>
          </div>
          {projectSettingsOpen ? <ChevronUp size={20} className="text-text-muted" /> : <ChevronDown size={20} className="text-text-muted" />}
        </button>

        {projectSettingsOpen && (
          <div className="border-t border-border-subtle p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">

            {/* Language Multi-Select */}
            <div className="space-y-1.5 flex flex-col">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Languages</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-12 justify-between bg-bg-sidebar border-border-subtle rounded-xl text-sm px-4 whitespace-nowrap overflow-hidden hover:bg-bg-sidebar">
                    <span className="truncate text-text-main font-normal">
                      {projectLanguage.length > 0 ? `${projectLanguage.length} selected` : (isLoadingProjLangs || isLoadingFullProject ? 'Loading...' : 'Select languages')}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div className="max-h-[300px] overflow-y-auto p-2">
                    {projectLanguages.map((lang: any) => {
                      const isChecked = projectLanguage.some(l => l.id === lang.id)
                      return (
                        <label key={lang.id} className="flex items-center gap-3 space-x-0 py-2.5 px-2 hover:bg-bg-sidebar rounded-md cursor-pointer transition-colors">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(c) => toggleLanguage(lang, !!c)}
                          />
                          <span className="text-sm cursor-pointer">{lang.name} ({lang.short_name})</span>
                        </label>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Timezone Dropdown */}
            <div className="space-y-1.5 flex flex-col">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Timezone</label>
              <Select
                value={projectTimezone}
                onValueChange={(val) => {
                  setProjectTimezone(val)
                  updateProjectSettingsMutation.mutate({ timezone_id: val })
                }}
              >
                <SelectTrigger className="bg-bg-sidebar border-border-subtle h-12 rounded-xl text-sm">
                  <SelectValue placeholder={isLoadingProjTime || isLoadingFullProject ? 'Loading...' : 'Select timezone'} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {projectTimezones.map((tz: any) => (
                    <SelectItem key={tz.id} value={tz.id}>
                      {tz.text}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Icon Category Multi-Select */}
            <div className="space-y-1.5 flex flex-col">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Icon Categories</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full h-12 justify-between bg-bg-sidebar border-border-subtle rounded-xl text-sm px-4 whitespace-nowrap overflow-hidden hover:bg-bg-sidebar">
                    <span className="truncate text-text-main font-normal">
                      {projectIconCat.length > 0 ? `${projectIconCat.length} selected` : (isLoadingIcons || isLoadingFullProject ? 'Loading...' : 'Select icon collections')}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div className="max-h-[300px] overflow-y-auto p-2">
                    {iconCollections.map((col: any) => {
                      const val = `${col.id}#${col.name}`
                      const isChecked = projectIconCat.includes(val)
                      return (
                        <label key={col.id} className="flex items-center gap-3 space-x-0 py-2.5 px-2 hover:bg-bg-sidebar rounded-md cursor-pointer transition-colors">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={(c) => toggleIconCat(col.id, col.name, !!c)}
                          />
                          <span className="text-sm cursor-pointer">{col.name} ({col.total} icons)</span>
                        </label>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

          </div>
        )}
      </div>

      {/* 3. Sessions Accordion */}
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
              <p className="font-bold text-text-main">{tWidgets('loginSessions')}</p>
              <p className="text-xs text-text-muted mt-0.5">{tWidgets('sessionsDescription')}</p>
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
                <p className="text-sm text-text-muted font-medium">{tWidgets('verifyingSessions')}</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12">
                <Shield size={32} className="text-text-muted/20 mx-auto mb-3" />
                <p className="text-text-muted text-sm">{tWidgets('noSessions')}</p>
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
                    <p className="text-[13px] text-text-main font-medium truncate">{session.data || tWidgets('unknownDevice')}</p>
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
                        {session.is_changed ? tWidgets('modified') : tWidgets('secure')}
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
                    title={tWidgets('terminateSession')}
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

      {/* 4. Languages Accordion */}
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
              <p className="font-bold text-text-main">{tWidgets('languageKeys')}</p>
              <p className="text-xs text-text-muted mt-0.5">{tWidgets('langDescription')}</p>
            </div>
          </div>
          {languagesOpen ? <ChevronUp size={20} className="text-text-muted" /> : <ChevronDown size={20} className="text-text-muted" />}
        </button>

        {languagesOpen && (
          <div className="border-t border-border-subtle p-6 overflow-x-auto">
            {languagesLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 size={24} className="animate-spin text-primary/40" />
                <p className="text-sm text-text-muted">{tWidgets('accessingLangDb')}</p>
              </div>
            ) : languages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Globe size={32} className="text-text-muted/20 mb-3" />
                <p className="text-text-muted text-sm font-medium">{tWidgets('noLangKeys')}</p>
                <p className="text-xs text-text-muted mt-1 opacity-60">{tWidgets('refreshSyncHint')}</p>
              </div>
            ) : (
              <div className="min-w-max space-y-8">
                {/* Headers */}
                <div className="flex items-center gap-6 px-2 mb-2">
                  <div className="w-[180px] shrink-0"></div>
                  <div className="flex flex-1 gap-4">
                    {languageKeys.map((code: string) => (
                      <div key={code} className="flex-1 min-w-[150px] text-center text-[13px] font-bold text-text-muted uppercase tracking-widest">
                        {code}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Grouped Lists */}
                {Object.entries(groupedLanguages).map(([category, items]: [string, any]) => (
                  <div key={category} className="space-y-4">
                    <p className="text-lg font-bold text-text-main px-2">{category}</p>
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
        )}
      </div>

      {/* 5. Environment Accordion */}
      <div className="bg-bg-card border border-border-subtle rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
        <button
          onClick={() => setEnvironmentOpen(p => !p)}
          className="w-full flex items-center justify-between px-8 py-6 hover:bg-bg-sidebar/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center">
              <Layers size={20} className="text-primary" />
            </div>
            <div className="text-left">
              <p className="font-bold text-text-main">{tWidgets('environmentManagement')}</p>
              <p className="text-xs text-text-muted mt-0.5">{tWidgets('envDescription')}</p>
            </div>
          </div>
          {environmentOpen ? <ChevronUp size={20} className="text-text-muted" /> : <ChevronDown size={20} className="text-text-muted" />}
        </button>

        {environmentOpen && (
          <div className="border-t border-border-subtle p-8">
            <EnvironmentPage projectId={projectId} />
          </div>
        )}
      </div>

    </div>
  )
}
