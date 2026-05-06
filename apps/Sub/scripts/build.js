import { readdir, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { listGroupAssetFileNames, resolveBuildPlan } from '#product'
import { parseProductArgs } from './lib/args.js'

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
const viteCliPath = path.resolve(repoDir, 'node_modules/vite/bin/vite.js')
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
const targetGroupAssetFiles = new Set(listGroupAssetFileNames(targetGroups))

try {
  const files = await readdir(assetsDir)
  await Promise.all(
    files
      .filter(
        (file) =>
          /^index\d+\.(js|css)$/.test(file) ||
          /^page-[a-z0-9-]+\.(js|css)$/.test(file) ||
          /^_plugin-vue_export-helper-.*\.mjs$/.test(file) ||
          targetGroupAssetFiles.has(file)
      )
      .map((file) => rm(path.join(assetsDir, file), { force: true }))
  )
} catch {}

if (isFullBuild) {
  await run('pnpm', ['exec', 'vite', 'build'], subDir, {
    VITE_PRODUCT_PROFILE: profile.id,
  })
}

const buildAppDirs = [...new Set(targetGroups.map((group) => group.appDir))]

for (const appDir of buildAppDirs) {
  const groupDir = path.resolve(repoDir, appDir)

  await run(
    'node',
    [
      viteCliPath,
      'build',
      '--config',
      path.resolve(groupDir, 'vite.config.js'),
    ],
    groupDir
  )
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
