// Builds a window.open() feature string that centers the popup on the monitor
// the app window currently lives on (screenLeft/screenTop handle multi-display).
export const centeredPopupFeatures = (width: number, height: number, extra = '') => {
  const dualLeft = window.screenLeft ?? window.screenX ?? 0
  const dualTop = window.screenTop ?? window.screenY ?? 0
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || screen.width
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || screen.height

  const left = Math.max(0, dualLeft + (viewportWidth - width) / 2)
  const top = Math.max(0, dualTop + (viewportHeight - height) / 2)

  const base = `width=${width},height=${height},left=${left},top=${top}`
  return extra ? `${base},${extra}` : base
}
