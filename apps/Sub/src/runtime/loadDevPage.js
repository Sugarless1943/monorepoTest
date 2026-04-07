const devPageModules = import.meta.glob('../../../*/src/index.vue')

function toDevModulePath(page) {
  const appDirName = page.appDir.replace(/^apps\//, '')
  return `../../../${appDirName}/${page.componentFile}`
}

export async function loadDevPage(page) {
  const modulePath = toDevModulePath(page)
  const loadPage = devPageModules[modulePath]

  if (!loadPage) {
    throw new Error(
      `Missing dev page module for ${page.slug}: expected ${modulePath}; available: ${Object.keys(devPageModules).join(', ')}`
    )
  }

  const mod = await loadPage()
  return mod.default
}
