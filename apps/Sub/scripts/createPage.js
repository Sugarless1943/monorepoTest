import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { getAllPages, getGroup, toPascalCase } from '#product'
import { pathExists, writeJson } from './lib/fs.js'

const subDir = path.resolve(import.meta.dirname, '..')
const repoDir = path.resolve(subDir, '../..')

function toPosixPath(value) {
  return value.split(path.sep).join('/')
}

function toModulePath(fromDir, targetPath) {
  const relativePath = toPosixPath(path.relative(fromDir, targetPath))
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
}

function formatString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

async function resolveProductDir() {
  const rootProductDir = path.resolve(repoDir, 'product')

  if (await pathExists(path.resolve(rootProductDir, 'pages'))) {
    return rootProductDir
  }

  return path.resolve(subDir, 'product')
}

function printUsage() {
  console.log(`Usage:

  pnpm create:page -- <page-slug> --group <group-slug> [--title <title>] [--order <number>]

Examples:

  pnpm create:page -- page-7 --group group-c
  pnpm create:page -- page-8 --group group-c --title "page8" --order 80
  pnpm create:page -- draft-page --group temp
`)
}

function normalizePageSlug(rawValue) {
  return String(rawValue ?? '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function parseArgs(rawArgs) {
  const options = {
    slug: '',
    groupSlug: '',
    title: '',
    order: null,
  }

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    }

    if (arg === '--title') {
      if (rawArgs[index + 1] === undefined) {
        throw new Error('Missing value for --title')
      }

      options.title = rawArgs[index + 1]?.trim() ?? ''
      index += 1
      continue
    }

    if (arg?.startsWith('--title=')) {
      options.title = arg.slice('--title='.length).trim()
      continue
    }

    if (arg === '--group') {
      if (rawArgs[index + 1] === undefined) {
        throw new Error('Missing value for --group')
      }

      options.groupSlug = rawArgs[index + 1]?.trim() ?? ''
      index += 1
      continue
    }

    if (arg?.startsWith('--group=')) {
      options.groupSlug = arg.slice('--group='.length).trim()
      continue
    }

    if (arg === '--order') {
      const value = rawArgs[index + 1]

      if (value === undefined) {
        throw new Error('Missing value for --order')
      }

      options.order = value === undefined ? null : Number.parseInt(value, 10)
      index += 1
      continue
    }

    if (arg?.startsWith('--order=')) {
      options.order = Number.parseInt(arg.slice('--order='.length), 10)
      continue
    }

    if (!options.slug) {
      options.slug = normalizePageSlug(arg)
      continue
    }

    throw new Error(`Unexpected argument: ${arg}`)
  }

  if (!options.slug) {
    throw new Error('Missing page slug')
  }

  if (!options.groupSlug) {
    throw new Error('Missing group slug')
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.slug)) {
    throw new Error(`Invalid page slug: ${options.slug}`)
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options.groupSlug)) {
    throw new Error(`Invalid group slug: ${options.groupSlug}`)
  }

  if (options.order !== null && !Number.isInteger(options.order)) {
    throw new Error('Page order must be an integer')
  }

  return options
}

function getNextOrder(existingPages) {
  const maxOrder = existingPages.reduce(
    (currentMax, page) => Math.max(currentMax, page.order ?? 0),
    0
  )

  return maxOrder + 10
}

function renderGroupPackageJson(packageName) {
  return {
    name: packageName,
    version: '1.0.0',
    description: '',
    main: 'src/index.ts',
    types: 'src/index.ts',
    imports: {
      '#product': './.imports/product.js',
      '#tooling/createSubPageViteConfig.js':
        './.imports/createSubPageViteConfig.js',
    },
    scripts: {
      build:
        'node ../../node_modules/vite/bin/vite.js build --config vite.config.js',
    },
    keywords: [],
    author: '',
    license: 'ISC',
    packageManager: 'pnpm@10.10.0',
    peerDependencies: {
      vue: '^3.5.25',
    },
  }
}

function renderGroupPackageViteConfig(group) {
  return `import { getAllPages } from '#product'
import { createSubGroupViteConfig } from '#tooling/createSubPageViteConfig.js'

const pages = getAllPages().filter((page) => page.groupSlug === ${JSON.stringify(
    group.slug
  )})

export default createSubGroupViteConfig({
  appDir: __dirname,
  pages,
})
`
}

function renderGroupPackageIndex(pages) {
  return `${pages
    .map((page) => {
      const entryFile = page.entryFile
      const exportPath = entryFile
        .replace(/^src\//, './')
        .replace(/\/index\.ts$/, '/index')
      return `export { default as ${page.moduleExportName} } from ${formatString(
        exportPath
      )}`
    })
    .join('\n')}
`
}

function renderGroupDefinition(group, pageSlugs) {
  const lines = [
    "import { defineGroup } from '../defineGroup.js'",
    '',
    `export default defineGroup(${formatString(group.slug)}, {`,
    `  title: ${formatString(group.title)},`,
    `  order: ${group.order ?? 0},`,
    `  pageSlugs: [${pageSlugs.map((slug) => formatString(slug)).join(', ')}],`,
  ]

  if (group.chunkFileName !== `${group.slug}.js`) {
    lines.push(`  chunkFileName: ${formatString(group.chunkFileName)},`)
  }

  lines.push(`  appDir: ${formatString(group.appDir)},`)
  lines.push(`  packageName: ${formatString(group.packageName)},`)

  if (group.temporary) {
    lines.push('  temporary: true,')
  }

  lines.push('})', '')

  return lines.join('\n')
}

function renderPageComponent({ slug, displayTitle, pascalName }) {
  return `<script setup>
const title = ${JSON.stringify(displayTitle)}
const description = ${JSON.stringify(`${pascalName} content.`)}
</script>

<template>
  <section class="${slug}">
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
  </section>
</template>

<style scoped>
.${slug} {
  padding: 24px;
}

h2 {
  margin: 0 0 12px;
}

p {
  margin: 0;
  color: #666;
}
</style>
`
}

function renderPageDefinition({
  slug,
  groupSlug,
  displayTitle,
  order,
  entryFile,
  componentFile,
}) {
  return `import { definePage } from '../definePage.js'

export default definePage(${formatString(slug)}, {
  groupSlug: ${formatString(groupSlug)},
  title: ${formatString(displayTitle)},
  order: ${order},
  entryFile: ${formatString(entryFile)},
  componentFile: ${formatString(componentFile)},
})
`
}

async function writeTextFile(targetPath, content) {
  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, content)
}

async function validateGeneratedPage(pageDefinitionPath) {
  const pageDefinitionUrl = `${pathToFileURL(pageDefinitionPath).href}?t=${Date.now()}`
  await import(pageDefinitionUrl)
}

function registerPageInPagesIndex(source, page) {
  const importName = page.moduleExportName
  const importLine = `import ${importName} from './${page.slug}.js'`

  if (source.includes(importLine)) {
    throw new Error(`Page ${page.slug} is already registered in pages/index.js`)
  }

  if (!source.includes('\nimport { getAllGroups')) {
    throw new Error('Cannot find product/pages/index.js import anchor')
  }

  const withImport = source.replace(
    '\nimport { getAllGroups',
    `\n${importLine}\n\nimport { getAllGroups`
  )
  const pagesPattern = /const pages = \[([^\]]*)\]/
  const pagesMatch = withImport.match(pagesPattern)

  if (!pagesMatch) {
    throw new Error('Cannot find product/pages/index.js pages array')
  }

  const pageImports = pagesMatch[1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

  if (pageImports.includes(importName)) {
    throw new Error(`Page import ${importName} is already in pages array`)
  }

  return withImport.replace(
    pagesPattern,
    `const pages = [${[...pageImports, importName].join(', ')}]`
  )
}

async function createTemporaryRegistrationPlan({ productDir, group, page }) {
  const pagesIndexPath = path.resolve(productDir, 'pages/index.js')
  const groupPath = path.resolve(productDir, 'groups', `${group.slug}.js`)

  if (!(await pathExists(pagesIndexPath))) {
    throw new Error(
      `Missing pages index: ${toPosixPath(path.relative(repoDir, pagesIndexPath))}`
    )
  }

  if (!(await pathExists(groupPath))) {
    throw new Error(
      `Missing group definition: ${toPosixPath(path.relative(repoDir, groupPath))}`
    )
  }

  const pageSlugs = group.pageSlugs.includes(page.slug)
    ? group.pageSlugs
    : [...group.pageSlugs, page.slug]

  return {
    pagesIndexPath,
    pagesIndexSource: registerPageInPagesIndex(
      await readFile(pagesIndexPath, 'utf8'),
      page
    ),
    groupPath,
    groupSource: renderGroupDefinition(group, pageSlugs),
  }
}

export async function createPage(rawArgs = process.argv.slice(2)) {
  const options = parseArgs(rawArgs)
  const existingPages = getAllPages()
  const group = getGroup(options.groupSlug)

  if (existingPages.some((page) => page.slug === options.slug)) {
    throw new Error(`Page already exists: ${options.slug}`)
  }

  const pascalName = toPascalCase(options.slug)
  const pageDirName = options.slug.replace(/-/g, '')
  const moduleExportName = options.slug.replace(/-([a-z0-9])/g, (_, char) =>
    char.toUpperCase()
  )
  const packageName = group.packageName
  const displayTitle = options.title || pascalName
  const order = options.order ?? getNextOrder(existingPages)
  const appDir = path.resolve(repoDir, group.appDir)
  const entryFile = `src/${pageDirName}/index.ts`
  const componentFile = `src/${pageDirName}/index.vue`
  const productDir = await resolveProductDir()
  const pageDefinitionPath = path.resolve(
    productDir,
    'pages',
    `${options.slug}.js`
  )
  const productImportPath = toModulePath(
    path.resolve(appDir, '.imports'),
    path.resolve(productDir, 'index.js')
  )

  if (await pathExists(pageDefinitionPath)) {
    throw new Error(
      `Page definition already exists: ${path.relative(repoDir, pageDefinitionPath)}`
    )
  }

  if (await pathExists(path.resolve(appDir, entryFile))) {
    throw new Error(
      `Page entry already exists: ${toPosixPath(
        path.relative(repoDir, path.resolve(appDir, entryFile))
      )}`
    )
  }

  const temporaryRegistration = group.temporary
    ? await createTemporaryRegistrationPlan({
        productDir,
        group,
        page: {
          slug: options.slug,
          moduleExportName,
        },
      })
    : null

  await mkdir(appDir, { recursive: true })

  if (!(await pathExists(path.resolve(appDir, 'package.json')))) {
    await writeJson(
      path.resolve(appDir, 'package.json'),
      renderGroupPackageJson(packageName)
    )
  }

  await writeTextFile(
    path.resolve(appDir, '.imports/product.js'),
    `export * from '${productImportPath}'\n`
  )
  await writeTextFile(
    path.resolve(appDir, '.imports/createSubPageViteConfig.js'),
    "export * from '../../Sub/tooling/createSubPageViteConfig.js'\n"
  )
  await writeTextFile(
    path.resolve(appDir, 'vite.config.js'),
    renderGroupPackageViteConfig(group)
  )

  const groupPages = [
    ...existingPages
      .filter((page) => page.groupSlug === group.slug)
      .map((page) => ({
        entryFile: page.entryFile,
        moduleExportName: page.moduleExportName,
      })),
    {
      entryFile,
      moduleExportName,
    },
  ].sort((left, right) => left.entryFile.localeCompare(right.entryFile))
  await writeTextFile(
    path.resolve(appDir, 'src/index.ts'),
    renderGroupPackageIndex(groupPages)
  )

  await writeTextFile(
    path.resolve(appDir, entryFile),
    "export { default } from './index.vue'\n"
  )
  await writeTextFile(
    path.resolve(appDir, componentFile),
    renderPageComponent({ slug: options.slug, displayTitle, pascalName })
  )
  await writeTextFile(
    pageDefinitionPath,
    renderPageDefinition({
      slug: options.slug,
      groupSlug: options.groupSlug,
      displayTitle,
      order,
      entryFile,
      componentFile,
    })
  )
  await validateGeneratedPage(pageDefinitionPath)

  if (temporaryRegistration) {
    await writeFile(
      temporaryRegistration.pagesIndexPath,
      temporaryRegistration.pagesIndexSource
    )
    await writeFile(
      temporaryRegistration.groupPath,
      temporaryRegistration.groupSource
    )
  }

  const relativePageDefinitionPath = toPosixPath(
    path.relative(repoDir, pageDefinitionPath)
  )

  console.log(`Created page ${options.slug}`)
  console.log(`  app: ${group.appDir}`)
  console.log(`  product: ${relativePageDefinitionPath}`)
  console.log(`  group: ${options.groupSlug}`)
  console.log(`  title: ${displayTitle}`)
  console.log(`  order: ${order}`)
  console.log('')

  if (group.temporary) {
    console.log('Temporary page registered for dev')
    console.log('Move it to a delivery group before build/export')
    return
  }

  console.log('Next steps:')
  console.log(
    `  1. Register ${options.slug} in ${toPosixPath(
      path.relative(repoDir, path.resolve(productDir, 'pages/index.js'))
    )}`
  )
  console.log(
    `  2. Add ${options.slug} to the desired ${toPosixPath(
      path.relative(repoDir, path.resolve(productDir, 'groups'))
    )}/*.js`
  )
  console.log(
    `  3. Add ${options.slug} to the desired ${toPosixPath(
      path.relative(repoDir, path.resolve(productDir, 'profiles'))
    )}/*.js`
  )
  console.log('  4. Run pnpm verify:sub -- --profile <profile-id>')
}

try {
  await createPage()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
