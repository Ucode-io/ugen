// Temporary diagnostics for the is_ugen reconcile flow.
//
// Grep `[is_ugen]` in the browser console to trace, per session, exactly where
// is_ugen came from and where it might have been lost:
//   store:setAuth          — initial write on login/register/invite
//   store:switchProjectAuth — workspace/project switch write
//   store:logout           — state reset
//   login:raw / login:reconcile / login:final
//   register:raw / register:reconcile / register:final
//   invite:raw             — invite path (no reconcile — risky)
//   refresh:reconcile      — background 401-refresh reconcile
//
// Flip ENABLED to false (or remove this file's call sites) once the backend
// reliably returns is_ugen in the login/refresh responses.
const ENABLED = true

export const logIsUgen = (stage: string, data: Record<string, unknown>) => {
  if (!ENABLED || typeof console === 'undefined') return
  // eslint-disable-next-line no-console
  console.log(`%c[is_ugen]%c ${stage}`, 'color:#d946ef;font-weight:bold', 'color:inherit', data)
}
