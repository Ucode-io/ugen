import { create } from 'zustand'
import { queryClient } from '@/shared/api/query-client'
import { logIsUgen } from '@/shared/lib/is-ugen-log'

export interface CodeEditorTarget {
  kind: 'frontend' | 'microfrontend' | 'function' | 'new_project'
  path?: string
  branch?: string
  name?: string
  type?: string
  repoId?: string
  id?: string
  url?: string
  projectId?: string
}
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Permission {
  id: string;
  action: string;
  resource: string;
}

export interface Language {
  id: string;
  key: string;
  translations: Record<string, string>;
  category: string;
  platform: string;
}

export interface UserData {
  id: string
  login: string
  email: string
  company_id: string
  environment_id: string
  role: {
    id?: string
    client_type_id?: string
    name?: string
  }
}

export interface ProjectData {
  company_id: string;
  project_id: string;
  status: string;
  subscription_type: string;
  title: string;
  fare_id: string;
  is_ugen: boolean;
  environment_id: string;
}

// Snapshot of the super-admin's own session, captured the moment they switch
// into another project from the all-projects view. Restoring it returns them to
// their original profile without re-authenticating.
export interface SuperAdminOrigin {
  project: ProjectData;
  accessToken: string;
  refreshToken: string;
  activeCompanyId: string | null;
}

export interface AuthState {
  user: UserData | null;
  project: ProjectData | null;
  permissions: Permission[];
  appPermissions: Permission[];
  globalPermission: Permission | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  activeView: "home" | "dashboard";
  apiKey: string | null;
  apiKeyProjectId: string | null;
  ucodeProjectId: string | null;
  projectEnvId: string | null;
  resourceEnvId: string | null;
  activeProjectTab: 'dashboard' | 'code' | 'preview' | null;
  activeCompanyId: string | null;
  codeEditorTarget: CodeEditorTarget | null;
  languages: Language[];
  superAdminOrigin: SuperAdminOrigin | null;
  setApiKey: (key: string | null, projectId?: string | null) => void;
  setUcodeProjectId: (key: string | null) => void;
  setProjectEnvId: (key: string | null) => void;
  setResourceEnvId: (key: string | null) => void;
  setActiveProjectTab: (tab: 'dashboard' | 'code' | 'preview' | null) => void;
  setCodeEditorTarget: (target: CodeEditorTarget | null) => void;
  setLanguages: (languages: Language[]) => void;
  setAuth: (
    user: UserData,
    project: ProjectData,
    permissions: Permission[],
    appPermissions: Permission[],
    globalPermission: Permission | null,
    accessToken: string,
    refreshToken: string,
  ) => void;
  switchProjectAuth: (
    project: Pick<ProjectData, 'project_id' | 'title' | 'environment_id' | 'is_ugen'> & { company_id?: string | null },
    accessToken: string,
    refreshToken: string,
  ) => void;
  // Capture the current session as the super-admin origin (no-op if one already
  // exists, so re-switching can't clobber the real home session).
  beginSuperAdminImpersonation: () => void;
  // Restore the captured super-admin session and clear the snapshot.
  endSuperAdminImpersonation: () => void;
  logout: () => void;
  setActiveView: (view: "home" | "dashboard") => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      project: null,
      permissions: [],
      appPermissions: [],
      globalPermission: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      activeView: 'home',
      apiKey: null,
      apiKeyProjectId: null,
      ucodeProjectId: null,
      projectEnvId: null,
      resourceEnvId: null,
      activeProjectTab: null,
      activeCompanyId: null,
      codeEditorTarget: null,
      languages: [],
      superAdminOrigin: null,
      setApiKey: (key, projectId = null) => set({ apiKey: key, apiKeyProjectId: key ? projectId : null }),
      setUcodeProjectId: (key) => set({ ucodeProjectId: key }),
      setProjectEnvId: (key) => set({ projectEnvId: key }),
      setResourceEnvId: (key) => set({ resourceEnvId: key }),
      setActiveProjectTab: (tab) => set({ activeProjectTab: tab }),
      setCodeEditorTarget: (target) => set({ codeEditorTarget: target }),
      setLanguages: (languages: Language[]) => set({ languages }),
      setAuth: (user, project, permissions, appPermissions, globalPermission, accessToken, refreshToken) => {
        logIsUgen('store:setAuth', {
          is_ugen: project?.is_ugen,
          project_id: project?.project_id,
          environment_id: project?.environment_id,
          company_id: project?.company_id,
        })
        set({
          user,
          project,
          permissions,
          appPermissions,
          globalPermission,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          activeView: 'dashboard',
          // Reset on every login so a stale activeCompanyId persisted from a
          // previous session can't leak into a new one. Seed it from the fresh
          // project_data when available.
          activeCompanyId: project?.company_id ?? null,
        })
      },
      switchProjectAuth: (projectPatch, accessToken, refreshToken) => {
        logIsUgen('store:switchProjectAuth', {
          is_ugen: projectPatch.is_ugen,
          project_id: projectPatch.project_id,
          title: projectPatch.title,
          company_id: projectPatch.company_id,
        })
        set((state) => ({
          accessToken,
          refreshToken,
          activeCompanyId: projectPatch.company_id ?? state.activeCompanyId,
          project: state.project
            ? {
                ...state.project,
                project_id: projectPatch.project_id,
                title: projectPatch.title,
                environment_id: projectPatch.environment_id,
                is_ugen: projectPatch.is_ugen,
              }
            : state.project,
        }))
      },
      beginSuperAdminImpersonation: () => {
        set((state) => {
          if (state.superAdminOrigin) return state
          if (!state.project || !state.accessToken || !state.refreshToken) return state
          return {
            superAdminOrigin: {
              project: state.project,
              accessToken: state.accessToken,
              refreshToken: state.refreshToken,
              activeCompanyId: state.activeCompanyId,
            },
          }
        })
      },
      endSuperAdminImpersonation: () => {
        set((state) => {
          const origin = state.superAdminOrigin
          if (!origin) return state
          return {
            project: origin.project,
            accessToken: origin.accessToken,
            refreshToken: origin.refreshToken,
            activeCompanyId: origin.activeCompanyId,
            superAdminOrigin: null,
          }
        })
      },
      logout: () => {
        logIsUgen('store:logout', {})
        queryClient.clear()
        set({
          user: null,
          project: null,
          permissions: [],
          appPermissions: [],
          globalPermission: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          activeView: 'home',
          apiKey: null,
          apiKeyProjectId: null,
          activeProjectTab: null,
          activeCompanyId: null,
          codeEditorTarget: null,
          languages: [],
          superAdminOrigin: null,
        })
      },
      setActiveView: (view) => set({ activeView: view }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
