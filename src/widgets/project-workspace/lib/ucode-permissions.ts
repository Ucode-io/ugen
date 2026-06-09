import { api } from '@/shared/api'

export interface NavPermFlags {
  read: boolean
  write: boolean
  update: boolean
  delete: boolean
}

// Map keyed by a generated-app nav path (e.g. "/users") -> CRUD flags for a role.
// The generated admin panel reads this (via VITE_UCODE_PERMISSIONS or a postMessage)
// and hides nav items whose linked custom permission has read === false.
export type NavPermissionMap = Record<string, NavPermFlags>

const yes = (v: unknown) => v === 'Yes' || v === true

/**
 * Fetch the role's custom permissions and build a nav-path -> flags map.
 * Only custom permissions that carry attributes.nav_path participate; the rest
 * (plain "function" permissions) are ignored here.
 */
export async function fetchNavPermissionMap(params: {
  roleId: string
  clientTypeId: string
  projectId?: string | null
}): Promise<NavPermissionMap> {
  const { roleId, clientTypeId, projectId } = params
  if (!roleId || !clientTypeId) return {}

  try {
    const { data } = await api.get('/v1/custom-permission/accesses/all', {
      params: {
        role_id: roleId,
        client_type_id: clientTypeId,
        ...(projectId ? { 'project-id': projectId } : {}),
      },
    })

    const permissions: any[] = data?.data?.permissions ?? data?.permissions ?? []
    const map: NavPermissionMap = {}

    for (const p of permissions) {
      const navPath: string | undefined = p?.attributes?.nav_path
      if (!navPath) continue
      map[navPath] = {
        read: yes(p.read),
        write: yes(p.write),
        update: yes(p.update),
        delete: yes(p.delete),
      }
    }

    return map
  } catch (err) {
    console.error('fetchNavPermissionMap failed', err)
    return {}
  }
}

/**
 * Post the permission map into a (possibly cross-origin) generated-app iframe.
 * The generated Sidebar listens for `{ type: 'UCODE_PERMISSIONS', permissions }`.
 */
export function postPermissionsToIframe(
  iframe: HTMLIFrameElement | null,
  permissions: NavPermissionMap,
) {
  iframe?.contentWindow?.postMessage({ type: 'UCODE_PERMISSIONS', permissions }, '*')
}
