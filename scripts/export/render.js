function toExportPageModuleFile(pageSlug) {
  return `${pageSlug}.js`
}

function toPageImportName(page) {
  return page.camelName
}

function formatArray(values) {
  return `[${values.map((value) => JSON.stringify(value)).join(', ')}]`
}

export function renderPagesIndex(selectedPages) {
  const imports = selectedPages
    .map(
      (page) =>
        `import ${toPageImportName(page)} from './${toExportPageModuleFile(page.slug)}'`
    )
    .join('\n')

  const pageList = selectedPages
    .map((page) => toPageImportName(page))
    .join(', ')

  return `${imports}

const pages = [${pageList}]

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
  const appDirName = page.appDir.split('/').pop()

  return uniqueValues(
    [
      page.slug,
      page.camelName,
      page.pascalName,
      page.routeName,
      page.routePath,
      page.chunkFileName,
      appDirName,
      page.slug.replace(/-/g, ''),
    ].map(normalizeSelector)
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

export function getAllPages() {
  return pages.slice()
}

export function getPage(slug) {
  const page = pagesBySlug[slug]

  if (!page) {
    throw new Error(\`Unknown page slug: \${slug}\`)
  }

  return page
}

export function listPageAssetFileNames(targetPages = pages) {
  return targetPages.flatMap((page) => [
    page.chunkFileName,
    page.chunkFileName.replace(/\\.js$/, '.css'),
  ])
}

export function resolvePageSelectors(selectors, availablePages = pages) {
  if (!selectors?.length) {
    return availablePages.slice()
  }

  const referenceMap = new Map()

  for (const page of availablePages) {
    for (const key of createPageReferenceKeys(page)) {
      if (referenceMap.has(key) && referenceMap.get(key).slug !== page.slug) {
        throw new Error(\`Ambiguous page selector key: \${key}\`)
      }

      referenceMap.set(key, page)
    }
  }

  const selectedSlugs = new Set()

  for (const selector of selectors) {
    const key = normalizeSelector(selector)
    const page = referenceMap.get(key)

    if (!page) {
      throw new Error(\`Unknown page selector: \${selector}\`)
    }

    selectedSlugs.add(page.slug)
  }

  return availablePages.filter((page) => selectedSlugs.has(page.slug))
}

export { pages, pagesBySlug }
`
}

export function renderLeafProductIndex() {
  return `export { toCamelCase, toPascalCase } from './case.js'
export { definePage } from './definePage.js'
export {
  getAllPages,
  getPage,
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
  getPage,
  listPageAssetFileNames,
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

  return createResolvedProfile({
    id: profileDefinition.id,
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

export { profiles, profilesById }
`
}

export function renderExportReadme({
  displayName,
  profileId,
  projectSlug,
  pages,
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
    ...pages.map(
      (page) => `- \`pnpm build:${page.camelName}\`：只构建 ${page.menuLabel}`
    ),
    `- \`pnpm build -- ${pages[0]?.camelName ?? 'pageA'}\`：增量构建单个页面`,
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

首次安装会为这个导出工程生成自己的 \`pnpm-lock.yaml\`，不再复用主仓的 lockfile。

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
