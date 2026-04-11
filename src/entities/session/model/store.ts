import { create } from 'zustand'

export interface CodeEditorTarget {
  kind: 'frontend' | 'microfrontend' | 'function'
  path?: string
  branch?: string
  name?: string
  type?: string
  repoId?: string
  id?: string
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
  ucodeProjectId: string | null;
  activeProjectTab: 'dashboard' | 'code' | 'preview' | null;
  codeEditorTarget: CodeEditorTarget | null;
  languages: Language[];
  setApiKey: (key: string | null) => void;
  setUcodeProjectId: (key: string | null) => void;
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
      ucodeProjectId: null,
      activeProjectTab: null,
      codeEditorTarget: null,
      languages: [],
      setApiKey: (key) => set({ apiKey: key }),
      setUcodeProjectId: (key) => set({ ucodeProjectId: key }),
      setActiveProjectTab: (tab) => set({ activeProjectTab: tab }),
      setCodeEditorTarget: (target) => set({ codeEditorTarget: target }),
      setLanguages: (languages: Language[]) => set({ languages }),
      setAuth: (user, project, permissions, appPermissions, globalPermission, accessToken, refreshToken) =>
        set({
          user,
          project,
          permissions,
          appPermissions,
          globalPermission,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          activeView: 'dashboard'
        }),
      logout: () =>
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
          activeProjectTab: null,
          codeEditorTarget: null,
          languages: [],
        }),
      setActiveView: (view) => set({ activeView: view }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
