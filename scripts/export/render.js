function toPageImportName(page) {
  return page.camelName
}

function formatArray(values) {
  return `[${values.map((value) => JSON.stringify(value)).join(', ')}]`
}

export function renderPagesIndex(selectedPages, groups = []) {
  const imports = selectedPages
    .map((page) => `import ${toPageImportName(page)} from './${page.slug}.js'`)
    .join('\n')

  const pageList = selectedPages
    .map((page) => toPageImportName(page))
    .join(', ')
  const groupList = groups
    .map(
      (group) => `{
  slug: ${JSON.stringify(group.slug)},
  title: ${JSON.stringify(group.title)},
  order: ${group.order ?? 0},
  pageSlugs: ${formatArray(group.pages.map((page) => page.slug))},
  chunkFileName: ${JSON.stringify(group.chunkFileName ?? `${group.slug}.js`)},
  appDir: ${JSON.stringify(group.appDir)},
  packageName: ${JSON.stringify(group.packageName)},
}`
    )
    .join(',\n')

  return `${imports}

const rawPages = [${pageList}]
const groups = [${groupList}]

const groupsBySlug = Object.freeze(
  Object.fromEntries(groups.map((group) => [group.slug, group]))
)
const pages = rawPages.map((page) => {
  const group = groupsBySlug[page.groupSlug]
  return Object.freeze({
    ...page,
    appDir: group?.appDir ?? page.appDir,
    packageName: group?.packageName ?? page.packageName,
  })
})

function normalizeSelector(value) {
  return String(value ?? '')
    .trim()
    .replace(/^\\/+/, '')
    .replace(/\\.js$/i, '')
    .toLowerCase()
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
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

function createGroupReferenceKeys(group) {
  return uniqueValues(
    [group.slug, group.title, group.slug.replace(/-/g, '')].map(
      normalizeSelector
    )
  )
}

function assertUniquePages() {
  const seenSlugs = new Set()

  for (const page of pages) {
    if (seenSlugs.has(page.slug)) {
      throw new Error(\`Duplicate page slug: \${page.slug}\`)
    }

    seenSlugs.add(page.slug)
  }
}

assertUniquePages()

const pagesBySlug = Object.freeze(
  Object.fromEntries(pages.map((page) => [page.slug, page]))
)

function sortGroups(targetGroups) {
  return targetGroups
    .slice()
    .sort(
      (left, right) =>
        left.order - right.order || left.slug.localeCompare(right.slug)
    )
}

export function getAllPages() {
  return pages.slice()
}

export function getAllGroups() {
  return sortGroups(groups)
}

export function getPage(slug) {
  const page = pagesBySlug[slug]

  if (!page) {
    throw new Error(\`Unknown page slug: \${slug}\`)
  }

  return page
}

export function getGroup(slug) {
  const group = groupsBySlug[slug]

  if (!group) {
    throw new Error(\`Unknown group slug: \${slug}\`)
  }

  return group
}

export function listGroupAssetFileNames(targetGroups = groups) {
  return targetGroups.map((group) => group.chunkFileName)
}

export function listPageAssetFileNames(targetPages = pages) {
  const groupBySlug = new Map(groups.map((group) => [group.slug, group]))

  return [
    ...new Set(
      targetPages
        .map((page) => groupBySlug.get(page.groupSlug)?.chunkFileName)
        .filter(Boolean)
    ),
  ]
}

export function resolvePageSelectors(selectors, availablePages = pages) {
  if (!selectors?.length) {
    return availablePages.slice()
  }

  const pageReferenceMap = new Map()
  const groupReferenceMap = new Map()
  const availablePageSlugs = new Set(availablePages.map((page) => page.slug))

  for (const page of availablePages) {
    for (const key of createPageReferenceKeys(page)) {
      if (
        pageReferenceMap.has(key) &&
        pageReferenceMap.get(key).slug !== page.slug
      ) {
        throw new Error(\`Ambiguous page selector key: \${key}\`)
      }

      pageReferenceMap.set(key, page)
    }
  }

  for (const group of groups) {
    const groupPages = availablePages.filter(
      (page) =>
        page.groupSlug === group.slug && availablePageSlugs.has(page.slug)
    )

    if (groupPages.length === 0) {
      continue
    }

    for (const key of createGroupReferenceKeys(group)) {
      if (
        groupReferenceMap.has(key) &&
        groupReferenceMap.get(key).slug !== group.slug
      ) {
        throw new Error(\`Ambiguous group selector key: \${key}\`)
      }

      groupReferenceMap.set(key, group)
    }
  }

  const selectedSlugs = new Set()

  for (const selector of selectors) {
    const key = normalizeSelector(selector)
    const page = pageReferenceMap.get(key)

    if (page) {
      selectedSlugs.add(page.slug)
      continue
    }

    const group = groupReferenceMap.get(key)

    if (!group) {
      throw new Error(\`Unknown page/group selector: \${selector}\`)
    }

    for (const pageSlug of group.pageSlugs) {
      if (availablePageSlugs.has(pageSlug)) {
        selectedSlugs.add(pageSlug)
      }
    }
  }

  return availablePages.filter((page) => selectedSlugs.has(page.slug))
}

export { groups, groupsBySlug, pages, pagesBySlug }
`
}

export function renderLeafProductIndex() {
  return `export { toCamelCase, toPascalCase } from './case.js'
export { definePage } from './definePage.js'
export {
  getAllGroups,
  getAllPages,
  getGroup,
  getPage,
  groups,
  groupsBySlug,
  listGroupAssetFileNames,
  listPageAssetFileNames,
  pages,
  pagesBySlug,
  resolvePageSelectors,
} from './pages/index.js'
export {
  getAllProfiles,
  getProfile,
  profiles,
  profilesById,
  resolveActiveProfile,
  resolveBuildPlan,
  resolveProfile,
} from './resolver.js'
`
}

export function renderLeafResolver(displayName, pageSlugs) {
  return `import {
  getAllGroups,
  getPage,
  getGroup,
  listGroupAssetFileNames,
  resolvePageSelectors,
} from './pages/index.js'

const leafProfile = Object.freeze({
  id: 'default',
  displayName: ${JSON.stringify(displayName)},
  pages: ${formatArray(pageSlugs)},
  runtimeConfig: {
    brandName: ${JSON.stringify(displayName)},
  },
})

const profiles = Object.freeze([leafProfile])
const profilesById = Object.freeze(
  Object.fromEntries(profiles.map((profile) => [profile.id, profile]))
)

function sortPages(pages) {
  return pages
    .slice()
    .sort(
      (left, right) =>
        left.order - right.order || left.slug.localeCompare(right.slug)
    )
}

function sortGroups(groups) {
  return groups
    .slice()
    .sort(
      (left, right) =>
        left.order - right.order || left.slug.localeCompare(right.slug)
    )
}

function flattenGroupedPages(groups) {
  return sortPages(groups.flatMap((group) => group.pages))
}

function applyGroupDefaults(page, group) {
  return Object.freeze({
    ...page,
    appDir: group.appDir,
    packageName: group.packageName,
  })
}

function resolveGroupsForPages(pages) {
  const selectedPageSlugs = new Set(pages.map((page) => page.slug))
  const groupedPageSlugs = new Set()
  const groups = []

  for (const group of sortGroups(getAllGroups())) {
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
          \`Page \${page.slug} is assigned to \${page.groupSlug}, but group \${group.slug} includes it\`
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
        \`Unknown group slug for page \${page.slug}: \${page.groupSlug}\`
      )
    }

    if (!groupedPageSlugs.has(page.slug)) {
      throw new Error(\`Page \${page.slug} is not registered in its group\`)
    }
  }

  return groups
}

function createResolvedProfile({ id, displayName, runtimeConfig, pages, groups }) {
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
          \`Duplicate \${label} in profile \${profileId}: \${value} (\${seen.get(value)} and \${page.slug})\`
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
          \`Duplicate route alias in profile \${profileId}: \${path} (\${seenAliases.get(path)} and \${page.slug})\`
        )
      }

      seenAliases.set(path, page.slug)
    }
  }
}

export function getProfile(profileId = 'default') {
  const profile = profilesById[profileId]

  if (!profile) {
    throw new Error(
      \`Unknown profile id: \${profileId}. This leaf export only contains default.\`
    )
  }

  return profile
}

export function getAllProfiles() {
  return profiles.slice()
}

export function resolveProfile(profileId = 'default') {
  const profileDefinition = getProfile(profileId)
  const pages = sortPages(
    profileDefinition.pages.map((pageSlug) => getPage(pageSlug))
  )

  assertUniquePageFields(pages, profileId)

  const displayName = profileDefinition.displayName ?? profileId
  const runtimeConfig = {
    ...profileDefinition.runtimeConfig,
    brandName: profileDefinition.runtimeConfig.brandName ?? displayName,
  }
  const groups = resolveGroupsForPages(pages)

  return createResolvedProfile({
    id: profileDefinition.id,
    displayName,
    runtimeConfig,
    pages,
    groups,
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
    groups: resolveGroupsForPages(pages),
  })
}

export function resolveBuildPlan({
  profileId = 'default',
  selectors = [],
} = {}) {
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

export { profiles, profilesById }
`
}

export function renderExportReadme({
  displayName,
  profileId,
  projectSlug,
  pages,
  groups,
  packageDirs,
  sourceRepo,
  sourceRevision,
}) {
  const pageList = pages
    .map((page) => `- \`${page.slug}\` (${page.menuLabel})`)
    .join('\n')
  const packageList =
    packageDirs.length > 0
      ? packageDirs.map((packageDir) => `- \`${packageDir}\``).join('\n')
      : '- 无额外 workspace package'
  const incrementalExamples = [
    '- `pnpm build:host`：只构建 host',
    ...groups.map(
      (group) =>
        `- \`pnpm build:${group.title}\`：只构建 ${group.title}（${group.pages
          .map((page) => page.menuLabel)
          .join(' / ')}）`
    ),
    `- \`pnpm build -- ${groups[0]?.slug ?? 'group-a'}\`：按 group 增量构建`,
  ].join('\n')

  return `# ${displayName}

这个工程由主仓按客户 profile 导出，默认已经裁剪为单客户源码包。
导出后的工程是叶子交付项目，不再提供二次 \`export\` 能力。

## 导出信息

- project slug: \`${projectSlug}\`
- source profile: \`${profileId}\`
- source repo: \`${sourceRepo}\`
- source revision: \`${sourceRevision}\`

## 包含页面

${pageList}

## 包含 package

${packageList}

## 使用方式

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

导出时已经生成当前交付工程自己的 \`pnpm-lock.yaml\`，用于锁定交付依赖版本。

构建产物默认会同步到根目录 \`dist/\`，方便在交付工程根目录直接预览。

\`\`\`bash
pnpm build
pnpm preview
\`\`\`

如果你使用 \`serve\` 这类静态服务器，请带上 SPA fallback：

\`\`\`bash
serve dist -s
\`\`\`

## 增量构建

${incrementalExamples}

## 验证命令

\`\`\`bash
pnpm verify
\`\`\`

这个命令只验证当前导出工程自身是否还能正常：

- build
- check-dist
- preview

它不会再执行二次 \`export\`。通常也不需要再传 \`--profile\`，因为导出工程默认只保留当前交付包自己的 \`default\` profile。

这个导出工程默认只保留一个 \`default\` profile，不需要再传 \`VITE_PRODUCT_PROFILE\`。
`
}
