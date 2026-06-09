// Super-admin identity. The all-projects view, per-project switch buttons and
// the "return to super admin" control are gated on these two ids together: the
// project the super-admin logs into, and the super-admin user itself (which is
// preserved across project switches, since switchProjectAuth never touches user).
export const SUPER_ADMIN_PROJECT_ID = 'ab56fb4f-833b-4798-8d5a-da39f3639b34'
export const SUPER_ADMIN_USER_ID = 'c12c163c-38ee-4b37-8854-1dc9285fc3f8'
