import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Permission {
  id: string;
  action: string;
  resource: string;
}

export interface UserData {
  id: string
  login: string
  email: string
  company_id: string
}

export interface ProjectData {
  company_id: string
  project_id: string
  status: string
  subscription_type: string
  title: string
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
          activeView: 'home'
        }),
      setActiveView: (view) => set({ activeView: view }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
