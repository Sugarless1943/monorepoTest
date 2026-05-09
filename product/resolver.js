import { getAllPages, getPage, resolvePageSelectors } from './pages/index.js'
import {
  getAllGroups,
  getGroup,
  listGroupAssetFileNames,
} from './groups/index.js'
import { getProfile, profilesById } from './profiles/index.js'

function sortGroups(groups) {
  return groups
    .slice()
    .sort(
      (left, right) =>
        left.order - right.order || left.slug.localeCompare(right.slug)
    )
}

function sortPages(pages) {
  return pages
    .slice()
    .sort(
      (left, right) =>
        left.order - right.order || left.slug.localeCompare(right.slug)
    )
}

function normalizeSelector(value) {
  return String(value ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\.js$/i, '')
    .toLowerCase()
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
}

function createGroupReferenceKeys(group) {
  return uniqueValues(
    [group.slug, group.title, group.slug.replace(/-/g, '')].map(
      normalizeSelector
    )
  )
}

function createPageReferenceKeys(page) {
  return uniqueValues(
    [
      page.slug,
      page.camelName,
      page.pascalName,
      page.routeName,
      page.routePath,
      page.slug.replace(/-/g, ''),
    ].map(normalizeSelector)
  )
}

function flattenGroupedPages(groups) {
  return sortPages(groups.flatMap((group) => group.pages))
}

function isTemporaryGroup(group) {
  return group.temporary === true
}

function getDeliveryGroups() {
  return getAllGroups().filter((group) => !isTemporaryGroup(group))
}

function assertNoTemporarySelectors(selectors) {
  if (!selectors?.length) {
    return
  }

  const temporaryReferenceKeys = new Map()

  for (const group of getAllGroups().filter(isTemporaryGroup)) {
    for (const key of createGroupReferenceKeys(group)) {
      temporaryReferenceKeys.set(key, group)
    }
  }

  for (const page of getAllPages().filter((page) =>
    isTemporaryGroup(getGroup(page.groupSlug))
  )) {
    for (const key of createPageReferenceKeys(page)) {
      temporaryReferenceKeys.set(key, page)
    }
  }

  for (const selector of selectors) {
    const temporaryItem = temporaryReferenceKeys.get(
      normalizeSelector(selector)
    )

    if (temporaryItem) {
      throw new Error(
        `Temporary selector ${selector} is dev-only and cannot be used in build/export`
      )
    }
  }
}

function resolveGroupSelectors(selectors, availableGroups = getAllGroups()) {
  if (!selectors?.length) {
    return sortGroups(availableGroups)
  }

  const groupReferenceMap = new Map()

  for (const group of availableGroups) {
    for (const key of createGroupReferenceKeys(group)) {
      if (
        groupReferenceMap.has(key) &&
        groupReferenceMap.get(key).slug !== group.slug
      ) {
        throw new Error(`Ambiguous group selector key: ${key}`)
      }

      groupReferenceMap.set(key, group)
    }
  }

  const selectedSlugs = new Set()

  for (const selector of selectors) {
    const key = normalizeSelector(selector)
    const group = groupReferenceMap.get(key)

    if (!group) {
      throw new Error(`Unknown group selector: ${selector}`)
    }

    selectedSlugs.add(group.slug)
  }

  return sortGroups(
    availableGroups.filter((group) => selectedSlugs.has(group.slug))
  )
}

function applyGroupDefaults(page, group) {
  return Object.freeze({
    ...page,
    appDir: group.appDir,
    packageName: group.packageName,
  })
}

function resolveGroupsForPages(pages, { includeTemporary = false } = {}) {
  const selectedPageSlugs = new Set(pages.map((page) => page.slug))
  const groupedPageSlugs = new Set()
  const groups = []
  const availableGroups = includeTemporary
    ? getAllGroups()
    : getDeliveryGroups()

  for (const group of sortGroups(availableGroups)) {
    const resolvedPages = sortPages(
      group.pageSlugs
        .map((pageSlug) => getPage(pageSlug))
        .filter((page) => selectedPageSlugs.has(page.slug))
    )

    if (resolvedPages.length === 0) {
      continue
    }

    for (const page of resolvedPages) {
      if (page.groupSlug !== group.slug) {
        throw new Error(
          `Page ${page.slug} is assigned to ${page.groupSlug}, but group ${group.slug} includes it`
        )
      }

      groupedPageSlugs.add(page.slug)
    }

    groups.push({
      ...group,
      pages: resolvedPages.map((page) => applyGroupDefaults(page, group)),
    })
  }

  for (const page of pages) {
    if (!getGroup(page.groupSlug)) {
      throw new Error(
        `Unknown group slug for page ${page.slug}: ${page.groupSlug}`
      )
    }

    if (!groupedPageSlugs.has(page.slug)) {
      throw new Error(`Page ${page.slug} is not registered in its group`)
    }
  }

  return groups
}

function createResolvedProfile({
  id,
  displayName,
  runtimeConfig,
  pages,
  groups,
}) {
  const resolvedPages = groups?.length ? flattenGroupedPages(groups) : pages
  const pageSlugs = resolvedPages.map((page) => page.slug)

  return {
    id,
    displayName,
    runtimeConfig,
    pageSlugs,
    pages: resolvedPages,
    groups,
    menus: resolvedPages
      .filter((page) => page.visibleInMenu)
      .map((page) => ({
        slug: page.slug,
        path: page.routePath,
        routeName: page.routeName,
        label: page.menuLabel,
      })),
    legacyRoutes: resolvedPages.flatMap((page) =>
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
      pages: profile.groups ? undefined : (profile.pages ?? result.pages),
      groups: profile.pages ? undefined : (profile.groups ?? result.groups),
      runtimeConfig: {
        ...result.runtimeConfig,
        ...profile.runtimeConfig,
      },
    }),
    {
      id: profileId,
      displayName: null,
      pages: undefined,
      groups: undefined,
      runtimeConfig: {},
    }
  )
}

function assertUniquePageFields(pages, profileId) {
  const uniqueFields = [
    ['routePath', 'route path'],
    ['routeName', 'route name'],
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
  const configuredPageSlugs = mergedProfile.groups
    ? resolveGroupSelectors(mergedProfile.groups, getDeliveryGroups()).flatMap(
        (group) => group.pageSlugs
      )
    : (mergedProfile.pages ??
      getAllPages()
        .filter((page) => !isTemporaryGroup(getGroup(page.groupSlug)))
        .map((page) => page.slug))
  const pages = sortPages(
    configuredPageSlugs.map((pageSlug) => getPage(pageSlug))
  )

  assertUniquePageFields(pages, profileId)

  const displayName = mergedProfile.displayName ?? profileId
  const runtimeConfig = {
    ...mergedProfile.runtimeConfig,
    brandName: mergedProfile.runtimeConfig.brandName ?? displayName,
  }
  const groups = resolveGroupsForPages(pages)

  return createResolvedProfile({
    id: profileId,
    displayName,
    runtimeConfig,
    pages,
    groups,
  })
}

export function resolveActiveProfile({
  profileId = 'default',
  selectors = [],
  includeTemporary = false,
} = {}) {
  const profile = resolveProfile(profileId)
  const availablePages = includeTemporary
    ? sortPages([
        ...profile.pages,
        ...getAllPages().filter((page) =>
          isTemporaryGroup(getGroup(page.groupSlug))
        ),
      ])
    : profile.pages
  const pages = selectors.length
    ? resolvePageSelectors(selectors, availablePages)
    : availablePages
  const groups = resolveGroupsForPages(pages, { includeTemporary })

  return createResolvedProfile({
    id: profile.id,
    displayName: profile.displayName,
    runtimeConfig: profile.runtimeConfig,
    pages,
    groups,
  })
}

export function resolveBuildPlan({
  profileId = 'default',
  selectors = [],
} = {}) {
  assertNoTemporarySelectors(selectors)
  const activeProfile = resolveActiveProfile({ profileId, selectors })
  const selectedGroupSlugs = new Set(
    activeProfile.groups.map((group) => group.slug)
  )
  const fullProfile = resolveProfile(profileId)
  const groups = fullProfile.groups.filter((group) =>
    selectedGroupSlugs.has(group.slug)
  )
  const pages = flattenGroupedPages(groups)
  const profile = createResolvedProfile({
    id: fullProfile.id,
    displayName: fullProfile.displayName,
    runtimeConfig: fullProfile.runtimeConfig,
    pages,
    groups,
  })

  return {
    profile,
    pages,
    groups: profile.groups,
    pageSlugs: pages.map((page) => page.slug),
    groupSlugs: profile.groups.map((group) => group.slug),
    appDirs: profile.groups.map((group) => group.appDir),
    packageNames: profile.groups.map((group) => group.packageName),
    assetFileNames: listGroupAssetFileNames(profile.groups),
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
      groups: profile.groups.map((group) => group.slug),
    },
  }
}
