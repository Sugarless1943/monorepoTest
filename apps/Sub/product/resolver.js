import {
  getAllPages,
  getPage,
  listPageAssetFileNames,
  resolvePageSelectors,
} from './pages/index.js'
import { getProfile, profilesById } from './profiles/index.js'

function sortPages(pages) {
  return pages
    .slice()
    .sort(
      (left, right) =>
        left.order - right.order || left.slug.localeCompare(right.slug)
    )
}

function createResolvedProfile({ id, displayName, runtimeConfig, pages }) {
  const pageSlugs = pages.map((page) => page.slug)

  return {
    id,
    displayName,
    runtimeConfig,
    pageSlugs,
    pages,
    menus: pages
      .filter((page) => page.visibleInMenu)
      .map((page) => ({
        slug: page.slug,
        path: page.routePath,
        routeName: page.routeName,
        label: page.menuLabel,
      })),
    legacyRoutes: pages.flatMap((page) =>
      page.aliases.map((legacyPath) => ({
        slug: page.slug,
        path: legacyPath,
        redirect: page.routePath,
      }))
    ),
  }
}

function mergeProfiles(profileId) {
  const visited = new Set()
  const chain = []
  let currentProfile = getProfile(profileId)

  while (currentProfile) {
    const parentProfileId = currentProfile.extends

    if (visited.has(currentProfile.id)) {
      throw new Error(
        `Circular profile inheritance detected: ${currentProfile.id}`
      )
    }

    visited.add(currentProfile.id)
    chain.unshift(currentProfile)
    currentProfile = parentProfileId ? profilesById[parentProfileId] : null

    if (currentProfile === undefined) {
      throw new Error(`Unknown parent profile: ${parentProfileId}`)
    }
  }

  return chain.reduce(
    (result, profile) => ({
      id: profileId,
      displayName: profile.displayName ?? result.displayName,
      pages: profile.pages ?? result.pages,
      runtimeConfig: {
        ...result.runtimeConfig,
        ...profile.runtimeConfig,
      },
    }),
    {
      id: profileId,
      displayName: null,
      pages: undefined,
      runtimeConfig: {},
    }
  )
}

function assertUniquePageFields(pages, profileId) {
  const uniqueFields = [
    ['routePath', 'route path'],
    ['routeName', 'route name'],
    ['chunkFileName', 'chunk file name'],
  ]

  for (const [field, label] of uniqueFields) {
    const seen = new Map()

    for (const page of pages) {
      const value = page[field]

      if (seen.has(value)) {
        throw new Error(
          `Duplicate ${label} in profile ${profileId}: ${value} (${seen.get(value)} and ${page.slug})`
        )
      }

      seen.set(value, page.slug)
    }
  }

  const seenAliases = new Map()

  for (const page of pages) {
    const allPaths = [page.routePath, ...page.aliases]

    for (const path of allPaths) {
      if (seenAliases.has(path)) {
        throw new Error(
          `Duplicate route alias in profile ${profileId}: ${path} (${seenAliases.get(path)} and ${page.slug})`
        )
      }

      seenAliases.set(path, page.slug)
    }
  }
}

export function resolveProfile(profileId = 'default') {
  const mergedProfile = mergeProfiles(profileId)
  const configuredPageSlugs =
    mergedProfile.pages ?? getAllPages().map((page) => page.slug)
  const pages = sortPages(
    configuredPageSlugs.map((pageSlug) => getPage(pageSlug))
  )
  const pageSlugs = pages.map((page) => page.slug)

  assertUniquePageFields(pages, profileId)

  const displayName = mergedProfile.displayName ?? profileId
  const runtimeConfig = {
    ...mergedProfile.runtimeConfig,
    brandName: mergedProfile.runtimeConfig.brandName ?? displayName,
  }

  return createResolvedProfile({
    id: profileId,
    displayName,
    runtimeConfig,
    pages,
  })
}

export function resolveActiveProfile({
  profileId = 'default',
  selectors = [],
} = {}) {
  const profile = resolveProfile(profileId)
  const pages = selectors.length
    ? resolvePageSelectors(selectors, profile.pages)
    : profile.pages

  return createResolvedProfile({
    id: profile.id,
    displayName: profile.displayName,
    runtimeConfig: profile.runtimeConfig,
    pages,
  })
}

export function resolveBuildPlan({
  profileId = 'default',
  selectors = [],
} = {}) {
  const profile = resolveActiveProfile({ profileId, selectors })
  const pages = profile.pages

  return {
    profile,
    pages,
    pageSlugs: pages.map((page) => page.slug),
    assetFileNames: listPageAssetFileNames(pages),
  }
}

export function resolveExportPlan({
  profileId = 'default',
  projectSlug,
  displayName,
  outputDir,
} = {}) {
  const profile = resolveProfile(profileId)
  const resolvedProjectSlug = projectSlug ?? profile.id
  const resolvedDisplayName = displayName ?? profile.displayName ?? profile.id

  return {
    profile,
    pages: profile.pages,
    projectSlug: resolvedProjectSlug,
    displayName: resolvedDisplayName,
    outputDir: outputDir ?? `outputs/export/${resolvedProjectSlug}`,
    manifest: {
      profileId: profile.id,
      projectSlug: resolvedProjectSlug,
      displayName: resolvedDisplayName,
      pages: profile.pageSlugs,
    },
  }
}
