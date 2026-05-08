import { readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getAllPages, getGroup, getPage } from '#product'
import { pathExists } from './lib/fs.js'

const subDir = path.resolve(import.meta.dirname, '..')
const repoDir = path.resolve(subDir, '../..')

function printUsage() {
  console.log(`Usage:

  pnpm move:page -- <page-slug> --to <group-slug> [--from <group-slug>]

Examples:

  pnpm move:page -- temp-page --to group-a
  pnpm move:page -- temp-page --from temp --to group-a
`)
}

function parseArgs(rawArgs) {
  const options = {
    fromGroupSlug: '',
    toGroupSlug: '',
    pageSlug: '',
  }

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (arg === '--help' || arg === '-h') {
      printUsage()
      process.exit(0)
    }

    if (arg === '--from') {
      if (rawArgs[index + 1] === undefined) {
        throw new Error('Missing value for --from')
      }

      options.fromGroupSlug = rawArgs[index + 1]?.trim() ?? ''
      index += 1
      continue
    }

    if (arg?.startsWith('--from=')) {
      options.fromGroupSlug = arg.slice('--from='.length).trim()
      continue
    }

    if (arg === '--to') {
      if (rawArgs[index + 1] === undefined) {
        throw new Error('Missing value for --to')
      }

      options.toGroupSlug = rawArgs[index + 1]?.trim() ?? ''
      index += 1
      continue
    }

    if (arg?.startsWith('--to=')) {
      options.toGroupSlug = arg.slice('--to='.length).trim()
      continue
    }

    if (!arg || arg === '--') {
      continue
    }

    if (arg.startsWith('-')) {
      throw new Error(`Unexpected option: ${arg}`)
    }

    if (options.pageSlug) {
      throw new Error('move:page supports one page at a time')
    }

    options.pageSlug = arg.trim()
  }

  if (!options.pageSlug) {
    throw new Error('Missing page slug')
  }

  if (!options.toGroupSlug) {
    throw new Error('Missing --to group slug')
  }

  return options
}

function toPosixPath(value) {
  return value.split(path.sep).join('/')
}

function formatString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

function groupFilePath(group) {
  return path.resolve(repoDir, 'product/groups', `${group.slug}.js`)
}

function pageFilePath(page) {
  return path.resolve(repoDir, 'product/pages', `${page.slug}.js`)
}

function appIndexPath(group) {
  return path.resolve(repoDir, group.appDir, 'src/index.ts')
}

function pageSourceDir(page, group) {
  return path.resolve(repoDir, group.appDir, path.dirname(page.componentFile))
}

function renderGroup(group, pageSlugs) {
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

function renderIndexExports(pages) {
  return `${pages
    .map((page) => {
      const exportPath = page.entryFile
        .replace(/^src\//, './')
        .replace(/\/index\.ts$/, '/index')

      return `export { default as ${page.moduleExportName} } from ${formatString(
        exportPath
      )}`
    })
    .join('\n')}\n`
}

function upsertPageProperty(source, key, value, afterKey = 'groupSlug') {
  const line = `  ${key}: ${formatString(value)},`
  const propertyPattern = new RegExp(`^(\\s*)${key}:\\s*['"][^'"]+['"],?`, 'm')

  if (propertyPattern.test(source)) {
    return source.replace(propertyPattern, line)
  }

  const afterPattern = new RegExp(`^(\\s*)${afterKey}:.*$,?`, 'm')
  const afterMatch = source.match(afterPattern)

  if (!afterMatch) {
    throw new Error(`Cannot insert ${key}; missing ${afterKey} in page file`)
  }

  const insertAt = afterMatch.index + afterMatch[0].length
  return `${source.slice(0, insertAt)}\n${line}${source.slice(insertAt)}`
}

function createPageDefinitionSource(source, targetGroup) {
  return [
    ['groupSlug', targetGroup.slug],
    ['packageName', targetGroup.packageName],
    ['appDir', targetGroup.appDir],
  ].reduce(
    (result, [key, value]) => upsertPageProperty(result, key, value),
    source
  )
}

async function updatePageDefinition(page, source) {
  const targetPath = pageFilePath(page)

  await writeFile(targetPath, source)
}

async function updateGroupDefinition(group, source) {
  await writeFile(groupFilePath(group), source)
}

async function updateGroupIndex(group, source) {
  await writeFile(appIndexPath(group), source)
}

async function assertPathExists(targetPath, label) {
  if (await pathExists(targetPath)) {
    return
  }

  throw new Error(
    `${label} does not exist: ${toPosixPath(path.relative(repoDir, targetPath))}`
  )
}

async function createMovePlan(options) {
  const page = getPage(options.pageSlug)
  const sourceGroup = getGroup(page.groupSlug)
  const targetGroup = getGroup(options.toGroupSlug)

  if (options.fromGroupSlug && options.fromGroupSlug !== sourceGroup.slug) {
    throw new Error(
      `Page ${page.slug} is in ${sourceGroup.slug}, not ${options.fromGroupSlug}`
    )
  }

  if (sourceGroup.slug === targetGroup.slug) {
    throw new Error(`Page ${page.slug} is already in ${targetGroup.slug}`)
  }

  const sourceDir = pageSourceDir(page, sourceGroup)
  const targetDir = pageSourceDir(page, targetGroup)
  const requiredPaths = [
    [pageFilePath(page), 'Page definition'],
    [groupFilePath(sourceGroup), 'Source group definition'],
    [groupFilePath(targetGroup), 'Target group definition'],
    [path.resolve(repoDir, sourceGroup.appDir), 'Source app directory'],
    [path.resolve(repoDir, targetGroup.appDir), 'Target app directory'],
    [appIndexPath(sourceGroup), 'Source app index'],
    [appIndexPath(targetGroup), 'Target app index'],
    [sourceDir, 'Page source directory'],
  ]

  for (const [targetPath, label] of requiredPaths) {
    await assertPathExists(targetPath, label)
  }

  if (await pathExists(targetDir)) {
    throw new Error(
      `Target page source dir already exists: ${toPosixPath(
        path.relative(repoDir, targetDir)
      )}`
    )
  }

  const allPages = getAllPages()
  const nextSourcePageSlugs = sourceGroup.pageSlugs.filter(
    (pageSlug) => pageSlug !== page.slug
  )
  const nextTargetPageSlugs = targetGroup.pageSlugs.includes(page.slug)
    ? targetGroup.pageSlugs
    : [...targetGroup.pageSlugs, page.slug]
  const nextSourcePages = allPages.filter(
    (item) => item.groupSlug === sourceGroup.slug && item.slug !== page.slug
  )
  const nextTargetPages = [
    ...allPages.filter((item) => item.groupSlug === targetGroup.slug),
    page,
  ].sort((left, right) => left.entryFile.localeCompare(right.entryFile))
  const nextPageSource = createPageDefinitionSource(
    await readFile(pageFilePath(page), 'utf8'),
    targetGroup
  )

  return {
    page,
    sourceGroup,
    targetGroup,
    sourceDir,
    targetDir,
    nextPageSource,
    nextSourceGroupSource: renderGroup(sourceGroup, nextSourcePageSlugs),
    nextTargetGroupSource: renderGroup(targetGroup, nextTargetPageSlugs),
    nextSourceIndexSource: renderIndexExports(nextSourcePages),
    nextTargetIndexSource: renderIndexExports(nextTargetPages),
  }
}

export async function movePage(rawArgs = process.argv.slice(2)) {
  const options = parseArgs(rawArgs)
  const plan = await createMovePlan(options)

  await rename(plan.sourceDir, plan.targetDir)
  await updatePageDefinition(plan.page, plan.nextPageSource)
  await updateGroupDefinition(plan.sourceGroup, plan.nextSourceGroupSource)
  await updateGroupDefinition(plan.targetGroup, plan.nextTargetGroupSource)
  await updateGroupIndex(plan.sourceGroup, plan.nextSourceIndexSource)
  await updateGroupIndex(plan.targetGroup, plan.nextTargetIndexSource)

  console.log(
    `Moved ${plan.page.slug} from ${plan.sourceGroup.slug} to ${plan.targetGroup.slug}`
  )
  console.log(`  from app: ${plan.sourceGroup.appDir}`)
  console.log(`  to app: ${plan.targetGroup.appDir}`)
}

try {
  await movePage()
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
