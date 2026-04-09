import { spawn } from 'node:child_process'
import { cp, mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { profilesById, resolveBuildPlan } from '#product'

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

function parseBuildArgs(rawArgs) {
  const args = rawArgs.filter((arg) => arg && arg !== '--')
  const positional = []
  let profileId =
    process.env.PRODUCT_PROFILE?.trim() ||
    process.env.VITE_PRODUCT_PROFILE?.trim() ||
    'default'
  let outputDir
  let explicitProfile = false

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--profile') {
      profileId = args[index + 1]?.trim() || profileId
      explicitProfile = true
      index += 1
      continue
    }

    if (arg.startsWith('--profile=')) {
      profileId = arg.slice('--profile='.length).trim() || profileId
      explicitProfile = true
      continue
    }

    if (arg === '--output-dir') {
      outputDir = args[index + 1]
      index += 1
      continue
    }

    if (arg.startsWith('--output-dir=')) {
      outputDir = arg.slice('--output-dir='.length)
      continue
    }

    positional.push(arg)
  }

  if (
    !explicitProfile &&
    positional.length > 0 &&
    profilesById[positional[0]]
  ) {
    profileId = positional.shift()
  }

  return {
    profileId,
    selectors: positional,
    outputDir,
  }
}

async function copyDist(sourceDir, targetDir) {
  await rm(targetDir, { recursive: true, force: true })
  await mkdir(path.dirname(targetDir), { recursive: true })

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await cp(sourceDir, targetDir, { recursive: true })
      return
    } catch (error) {
      if (error?.code !== 'EEXIST' || attempt === 1) {
        throw error
      }

      await rm(targetDir, { recursive: true, force: true })
    }
  }
}

function toRelativePath(repoDir, targetPath) {
  return path.relative(repoDir, targetPath).replaceAll(path.sep, '/')
}

export async function runBuild(rawArgs = process.argv.slice(2)) {
  const args = parseBuildArgs(rawArgs)
  const repoDir = path.resolve(import.meta.dirname, '..')
  const subDir = path.resolve(repoDir, 'apps/Sub')
  const sourceDistDir = path.resolve(subDir, 'dist')
  const plan = resolveBuildPlan({
    profileId: args.profileId,
    selectors: args.selectors,
  })
  const targetDir = path.resolve(
    repoDir,
    args.outputDir ?? path.join('dists', plan.profile.id)
  )

  await run(
    'pnpm',
    ['run', 'build', '--', '--profile', plan.profile.id, ...args.selectors],
    subDir
  )
  await copyDist(sourceDistDir, targetDir)

  console.log(
    `Built ${plan.profile.id} to ${toRelativePath(repoDir, targetDir)}`
  )
}

await runBuild()
