import { resolveActiveProfile } from '#product'

function parseSelectedPageSlugs(rawValue) {
  if (!rawValue) {
    return []
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export const activeProductProfileId =
  import.meta.env.VITE_PRODUCT_PROFILE?.trim() || 'default'
export const activeProductPageSlugs = parseSelectedPageSlugs(
  import.meta.env.VITE_PRODUCT_PAGE_SLUGS
)

export const productProfile = resolveActiveProfile({
  profileId: activeProductProfileId,
  selectors: activeProductPageSlugs,
  includeTemporary: import.meta.env.DEV,
})
export const productGroups = productProfile.groups
export const productPages = productProfile.pages
export const productMenus = productProfile.menus
export const productLegacyRoutes = productProfile.legacyRoutes
