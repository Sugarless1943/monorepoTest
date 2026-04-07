import { readdir, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { listPageAssetFileNames, resolveBuildPlan } from '../product/index.js'
import { parseProductArgs } from './productArgs.js'

function run(command, args, cwd, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: 'inherit',
      shell: true,
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`))
    })
  })
}

const subDir = path.resolve(import.meta.dirname, '..')
const repoDir = path.resolve(subDir, '../..')
const assetsDir = path.resolve(subDir, 'dist/assets')
const { profileId, selectors } = parseProductArgs(process.argv.slice(2))
const { profile, pages: targetPages } = resolveBuildPlan({
  profileId,
  selectors,
})
const knownPageAssetFiles = new Set(listPageAssetFileNames())

try {
  const files = await readdir(assetsDir)
  await Promise.all(
    files
      .filter(
        (file) =>
          /^index\d+\.(js|css)$/.test(file) || knownPageAssetFiles.has(file)
      )
      .map((file) => rm(path.join(assetsDir, file), { force: true }))
  )
} catch {}

await run('pnpm', ['exec', 'vite', 'build'], subDir, {
  VITE_PRODUCT_PROFILE: profile.id,
  VITE_PRODUCT_PAGE_SLUGS: targetPages.map((page) => page.slug).join(','),
})

for (const page of targetPages) {
  await run('pnpm', ['build'], path.resolve(repoDir, page.appDir))
}

await run(
  'node',
  [
    './scripts/check-dist.js',
    '--profile',
    profile.id,
    ...targetPages.map((page) => page.slug),
  ],
  subDir
)
