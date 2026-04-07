import { execSync } from 'node:child_process'
import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { resolveExportPlan } from '../product/index.js'

const subDir = path.resolve(import.meta.dirname, '..')
const repoDir = path.resolve(subDir, '../..')

const ROOT_FILES_TO_COPY = [
  '.gitignore',
  '.npmrc',
  '.prettierignore',
  '.prettierrc',
  'pnpm-workspace.yaml',
  'tsconfig.json',
  'tsconfig.node.json',
  'vite-env.d.ts',
]

const ROOT_DEV_DEPENDENCIES = [
  '@types/node',
  '@vitejs/plugin-vue',
  'typescript',
  'vite',
]

function parseExportArgs(rawArgs) {
  const positional = []
  const options = {
    force: false,
    outputDir: undefined,
    displayName: undefined,
  }

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (!arg || arg === '--') {
      continue
    }

    if (arg === '--force') {
      options.force = true
      continue
    }

    if (arg === '--output-dir') {
      options.outputDir = rawArgs[index + 1]
      index += 1
      continue
    }

    if (arg.startsWith('--output-dir=')) {
      options.outputDir = arg.slice('--output-dir='.length)
      continue
    }

    if (arg === '--display-name') {
      options.displayName = rawArgs[index + 1]
      index += 1
      continue
    }

    if (arg.startsWith('--display-name=')) {
      options.displayName = arg.slice('--display-name='.length)
      continue
    }

    positional.push(arg)
  }

  return {
    profileId: positional[0] ?? 'default',
    projectSlug: positional[1],
    displayName: options.displayName ?? positional[2],
    outputDir: options.outputDir,
    force: options.force,
  }
}

function isWorkspaceVersion(value) {
  return typeof value === 'string' && value.startsWith('workspace:')
}

function pickDependencies(source, names) {
  const result = {}

  for (const name of names) {
    if (source?.[name]) {
      result[name] = source[name]
    }
  }

  return result
}

function filterWorkspaceDependencies(
  dependencies,
  allowedWorkspacePackageNames
) {
  const result = {}

  for (const [name, version] of Object.entries(dependencies ?? {})) {
    if (
      !isWorkspaceVersion(version) ||
      allowedWorkspacePackageNames.has(name)
    ) {
      result[name] = version
    }
  }

  return result
}

function createCopyFilter() {
  const ignoredNames = new Set(['node_modules', 'dist', '.DS_Store', '.vscode'])

  return (source) => !ignoredNames.has(path.basename(source))
}

function toRelativePath(targetPath) {
  return path.relative(repoDir, targetPath).replaceAll(path.sep, '/')
}

function toExportPageModuleFile(pageSlug) {
  return `${pageSlug}.js`
}

function toPageImportName(page) {
  return page.camelName
}

function formatArray(values) {
  return `[${values.map((value) => JSON.stringify(value)).join(', ')}]`
}

function createPageBuildScripts(pages, baseRelativeDir) {
  return Object.fromEntries(
    pages.map((page) => {
      const appDirName = path.basename(page.appDir)
      return [
        `build:${page.camelName}`,
        `cd ${baseRelativeDir}${appDirName} && pnpm build`,
      ]
    })
  )
}

function renderPagesIndex(selectedPages) {
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

function renderDefaultProfile(displayName, pageSlugs) {
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

function renderProfilesIndex() {
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

function renderExportReadme({
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

构建产物：

\`\`\`bash
pnpm build
\`\`\`

## 增量构建

${incrementalExamples}

这个导出工程默认只保留一个 \`default\` profile，不需要再传 \`VITE_PRODUCT_PROFILE\`。
`
}

async function pathExists(targetPath) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

async function readJson(targetPath) {
  return JSON.parse(await readFile(targetPath, 'utf8'))
}

async function writeJson(targetPath, value) {
  await writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`)
}

async function copyFileIfExists(relativePath, exportDir) {
  const sourcePath = path.resolve(repoDir, relativePath)

  if (!(await pathExists(sourcePath))) {
    return
  }

  const targetPath = path.resolve(exportDir, relativePath)
  await mkdir(path.dirname(targetPath), { recursive: true })
  await cp(sourcePath, targetPath)
}

async function copyDirectory(relativePath, exportDir) {
  await cp(
    path.resolve(repoDir, relativePath),
    path.resolve(exportDir, relativePath),
    {
      recursive: true,
      filter: createCopyFilter(),
    }
  )
}

function getWorkspaceDependencyNames(manifest) {
  return [
    ...Object.entries(manifest.dependencies ?? {}),
    ...Object.entries(manifest.devDependencies ?? {}),
    ...Object.entries(manifest.peerDependencies ?? {}),
    ...Object.entries(manifest.optionalDependencies ?? {}),
  ]
    .filter(([, version]) => isWorkspaceVersion(version))
    .map(([name]) => name)
}

async function getWorkspaceEntries() {
  const workspaceEntries = []

  for (const workspaceRoot of ['apps', 'packages']) {
    const workspaceRootPath = path.resolve(repoDir, workspaceRoot)
    const items = await readdir(workspaceRootPath, { withFileTypes: true })

    for (const item of items) {
      if (!item.isDirectory()) {
        continue
      }

      const relativeDir = `${workspaceRoot}/${item.name}`
      const manifestPath = path.resolve(repoDir, relativeDir, 'package.json')

      if (!(await pathExists(manifestPath))) {
        continue
      }

      workspaceEntries.push({
        relativeDir,
        manifest: await readJson(manifestPath),
      })
    }
  }

  return {
    byRelativeDir: new Map(
      workspaceEntries.map((entry) => [entry.relativeDir, entry])
    ),
    byPackageName: new Map(
      workspaceEntries.map((entry) => [entry.manifest.name, entry])
    ),
  }
}

async function collectExportPackageDirs(selectedAppDirs) {
  const workspaceEntries = await getWorkspaceEntries()
  const packageDirs = new Set()
  const visitedDirs = new Set()
  const queue = [...selectedAppDirs]

  while (queue.length > 0) {
    const relativeDir = queue.shift()

    if (visitedDirs.has(relativeDir)) {
      continue
    }

    visitedDirs.add(relativeDir)

    const workspaceEntry = workspaceEntries.byRelativeDir.get(relativeDir)

    if (!workspaceEntry) {
      continue
    }

    for (const dependencyName of getWorkspaceDependencyNames(
      workspaceEntry.manifest
    )) {
      const dependencyEntry = workspaceEntries.byPackageName.get(dependencyName)

      if (
        !dependencyEntry ||
        !dependencyEntry.relativeDir.startsWith('packages/')
      ) {
        continue
      }

      if (!packageDirs.has(dependencyEntry.relativeDir)) {
        packageDirs.add(dependencyEntry.relativeDir)
        queue.push(dependencyEntry.relativeDir)
      }
    }
  }

  return [...packageDirs].sort()
}

function getGitValue(command) {
  try {
    return execSync(command, {
      cwd: repoDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return 'unknown'
  }
}

async function rewriteRootPackage(exportDir, plan) {
  const sourcePackage = await readJson(path.resolve(repoDir, 'package.json'))
  const targetPackage = {
    name: plan.projectSlug,
    private: true,
    version: sourcePackage.version,
    description: plan.displayName,
    packageManager: sourcePackage.packageManager,
    engines: sourcePackage.engines,
    scripts: {
      start: 'cd apps/Sub && pnpm dev',
      dev: 'cd apps/Sub && pnpm dev',
      build: 'cd apps/Sub && pnpm build',
      'build:sub': 'cd apps/Sub && pnpm build',
      'build:host': 'cd apps/Sub && pnpm build:host',
      'check:dist': 'cd apps/Sub && pnpm check:dist',
      preview: 'cd apps/Sub && pnpm preview',
      ...Object.fromEntries(
        Object.entries(createPageBuildScripts(plan.pages, 'apps/')).map(
          ([scriptName]) => [scriptName, `cd apps/Sub && pnpm ${scriptName}`]
        )
      ),
    },
    devDependencies: pickDependencies(
      sourcePackage.devDependencies,
      ROOT_DEV_DEPENDENCIES
    ),
  }

  await writeJson(path.resolve(exportDir, 'package.json'), targetPackage)
}

async function rewriteSubPackage(exportDir, plan, exportPackageNames) {
  const packagePath = path.resolve(exportDir, 'apps/Sub/package.json')
  const sourcePackage = await readJson(packagePath)
  const targetPackage = {
    ...sourcePackage,
    scripts: {
      dev: 'vite',
      build: 'node ./scripts/build.js',
      ...createPageBuildScripts(plan.pages, '../'),
      'build:host': 'pnpm exec vite build',
      'check:dist': 'node ./scripts/check-dist.js',
      preview: 'vite preview',
    },
    dependencies: filterWorkspaceDependencies(
      sourcePackage.dependencies,
      exportPackageNames
    ),
  }

  await writeJson(packagePath, targetPackage)
}

async function rewriteProductFiles(exportDir, plan) {
  const pageSlugs = plan.profile.pageSlugs
  const productDir = path.resolve(exportDir, 'apps/Sub/product')
  const pagesDir = path.resolve(productDir, 'pages')
  const profilesDir = path.resolve(productDir, 'profiles')

  for (const pageFileName of await readdir(pagesDir)) {
    if (
      pageFileName === 'index.js' ||
      pageSlugs.includes(pageFileName.replace(/\.js$/, ''))
    ) {
      continue
    }

    await rm(path.resolve(pagesDir, pageFileName), { force: true })
  }

  for (const profileFileName of await readdir(profilesDir)) {
    if (profileFileName === 'default.js' || profileFileName === 'index.js') {
      continue
    }

    await rm(path.resolve(profilesDir, profileFileName), { force: true })
  }

  await writeFile(
    path.resolve(pagesDir, 'index.js'),
    renderPagesIndex(plan.pages)
  )
  await writeFile(
    path.resolve(profilesDir, 'default.js'),
    renderDefaultProfile(plan.displayName, pageSlugs)
  )
  await writeFile(path.resolve(profilesDir, 'index.js'), renderProfilesIndex())
}

async function writeExportArtifacts(exportDir, plan, packageDirs) {
  const sourceRepo = getGitValue('git config --get remote.origin.url')
  const sourceRevision = getGitValue('git rev-parse HEAD')
  const manifest = {
    ...plan.manifest,
    packageDirs,
    sourceRepo,
    sourceRevision,
    generatedAt: new Date().toISOString(),
  }

  await writeJson(path.resolve(exportDir, 'export-manifest.json'), manifest)
  await writeFile(
    path.resolve(exportDir, 'README.md'),
    renderExportReadme({
      displayName: plan.displayName,
      profileId: plan.profile.id,
      projectSlug: plan.projectSlug,
      pages: plan.pages,
      packageDirs,
      sourceRepo,
      sourceRevision,
    })
  )
}

async function main() {
  const args = parseExportArgs(process.argv.slice(2))
  const plan = resolveExportPlan({
    profileId: args.profileId,
    projectSlug: args.projectSlug,
    displayName: args.displayName,
    outputDir:
      args.outputDir ?? `exports/${args.projectSlug ?? args.profileId}`,
  })
  const exportDir = path.resolve(repoDir, plan.outputDir)

  if (await pathExists(exportDir)) {
    if (!args.force) {
      throw new Error(
        `Export target already exists: ${toRelativePath(exportDir)}. Use --force to overwrite.`
      )
    }

    await rm(exportDir, { recursive: true, force: true })
  }

  await mkdir(exportDir, { recursive: true })

  const selectedAppDirs = ['apps/Sub', ...plan.pages.map((page) => page.appDir)]
  const packageDirs = await collectExportPackageDirs(selectedAppDirs)

  for (const relativePath of ROOT_FILES_TO_COPY) {
    await copyFileIfExists(relativePath, exportDir)
  }

  for (const relativeDir of [...selectedAppDirs, ...packageDirs]) {
    await copyDirectory(relativeDir, exportDir)
  }

  const exportPackageNames = new Set(
    (
      await Promise.all(
        packageDirs.map(async (packageDir) => {
          const manifest = await readJson(
            path.resolve(repoDir, packageDir, 'package.json')
          )
          return manifest.name
        })
      )
    ).filter(Boolean)
  )

  await rewriteRootPackage(exportDir, plan)
  await rewriteSubPackage(exportDir, plan, exportPackageNames)
  await rewriteProductFiles(exportDir, plan)
  await writeExportArtifacts(exportDir, plan, packageDirs)

  console.log(`Exported ${plan.profile.id} to ${toRelativePath(exportDir)}`)
}

await main()
