import { access, readdir } from 'node:fs/promises'
import path from 'node:path'
import { listPageAssetFileNames, resolveBuildPlan } from '../product/index.js'
import { parseProductArgs } from './productArgs.js'

const subDir = path.resolve(import.meta.dirname, '..')
const distDir = path.resolve(subDir, 'dist')
const assetsDir = path.resolve(distDir, 'assets')
const { profileId, selectors } = parseProductArgs(process.argv.slice(2))
const { profile, pages: targetPages } = resolveBuildPlan({
  profileId,
  selectors,
})
const expectedPageAssetFiles = new Set(
  targetPages.map((page) => page.chunkFileName)
)
const knownPageAssetFiles = new Set(listPageAssetFileNames())

const requiredFiles = [
  path.resolve(distDir, 'index.html'),
  path.resolve(distDir, 'assets/index.js'),
  path.resolve(distDir, 'assets/vendor.js'),
  path.resolve(distDir, 'shared/vue-runtime.js'),
  ...targetPages.map((page) =>
    path.resolve(distDir, 'assets', page.chunkFileName)
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
const unexpectedPageAssets = distAssetFiles.filter(
  (file) => knownPageAssetFiles.has(file) && !expectedPageAssetFiles.has(file)
)

if (unexpectedPageAssets.length > 0) {
  console.error(
    `Unexpected page artifacts for profile ${profile.id}: ${unexpectedPageAssets.join(', ')}`
  )
  process.exit(1)
}

console.log(
  `Verified dist artifacts for profile ${profile.id}: ${targetPages
    .map((page) => page.slug)
    .join(', ')}`
)
