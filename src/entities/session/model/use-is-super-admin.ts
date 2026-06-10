import { SUPER_ADMIN_USER_ID } from '@/shared/config'
import { useAuthStore } from './store'

// True for the entire super-admin session -- both on their own home/all-projects
// project AND while impersonating another project. switchProjectAuth swaps
// `project` but preserves `user`, so we key off the user id (same signal that
// shows SuperAdminReturnButton), NOT the project id. Used to suppress
// project-billing calls (company-stats, subscription/current, fare) that don't
// apply to a super-admin session.
export const useIsSuperAdmin = () =>
  useAuthStore((s) => s.user?.id === SUPER_ADMIN_USER_ID)
