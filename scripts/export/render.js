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

export function renderDefaultProfile(displayName, pageSlugs) {
  return `import { defineProfile } from '../defineProfile.js'

export default defineProfile('default', {
  displayName: ${JSON.stringify(displayName)},
  pages: ${formatArray(pageSlugs)},
  runtimeConfig: {
    brandName: ${JSON.stringify(displayName)},
  },
})
`
}

export function renderProfilesIndex() {
  return `import defaultProfile from './default.js'

const profiles = [defaultProfile]

function assertUniqueProfiles() {
  const seenIds = new Set()

  for (const profile of profiles) {
    if (seenIds.has(profile.id)) {
      throw new Error(\`Duplicate profile id: \${profile.id}\`)
    }

    seenIds.add(profile.id)
  }
}

assertUniqueProfiles()

const profilesById = Object.freeze(
  Object.fromEntries(profiles.map((profile) => [profile.id, profile]))
)

export function getProfile(profileId) {
  const profile = profilesById[profileId]

  if (!profile) {
    throw new Error(\`Unknown profile id: \${profileId}\`)
  }

  return profile
}

export function getAllProfiles() {
  return profiles.slice()
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

这个导出工程默认只保留一个 \`default\` profile，不需要再传 \`VITE_PRODUCT_PROFILE\`。
`
}
