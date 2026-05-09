import { access, readdir } from 'node:fs/promises'
import path from 'node:path'
import { listGroupAssetFileNames, resolveBuildPlan } from '#product'
import { parseProductArgs } from './lib/args.js'

const subDir = path.resolve(import.meta.dirname, '..')
const distDir = path.resolve(subDir, 'dist')
const assetsDir = path.resolve(distDir, 'assets')
const { profileId, selectors } = parseProductArgs(process.argv.slice(2))
const {
  profile,
  groups: targetGroups,
  pages: targetPages,
} = resolveBuildPlan({
  profileId,
  selectors,
})
const isFullBuild = selectors.length === 0
const expectedGroupAssetFiles = new Set(
  targetGroups.map((group) => group.chunkFileName)
)
const knownGroupAssetFiles = new Set(listGroupAssetFileNames())

const requiredFiles = [
  path.resolve(distDir, 'index.html'),
  path.resolve(distDir, 'assets/index.js'),
  path.resolve(distDir, 'assets/framework.js'),
  path.resolve(distDir, 'assets/element-plus.js'),
  path.resolve(distDir, 'assets/vendor.js'),
  path.resolve(distDir, 'shared/vue-runtime.js'),
  ...targetGroups.map((group) =>
    path.resolve(distDir, 'assets', group.chunkFileName)
  ),
]

for (const file of requiredFiles) {
  try {
    await access(file)
  } catch {
    console.error(`Missing build artifact: ${file}`)
    process.exit(1)
  }
}

const distAssetFiles = await readdir(assetsDir)
const unexpectedPageAssets = distAssetFiles.filter((file) =>
  /^page-[a-z0-9-]+\.(js|css)$/.test(file)
)
const unexpectedGroupAssets = isFullBuild
  ? distAssetFiles.filter(
      (file) =>
        knownGroupAssetFiles.has(file) && !expectedGroupAssetFiles.has(file)
    )
  : []

if (unexpectedPageAssets.length > 0) {
  console.error(
    `Unexpected page-level artifacts for profile ${profile.id}: ${unexpectedPageAssets.join(', ')}`
  )
  process.exit(1)
}

if (unexpectedGroupAssets.length > 0) {
  console.error(
    `Unexpected group artifacts for profile ${profile.id}: ${unexpectedGroupAssets.join(', ')}`
  )
  process.exit(1)
}

console.log(
  `Verified dist artifacts for profile ${profile.id}: ${targetPages
    .map((page) => page.slug)
    .join(', ')}`
)
