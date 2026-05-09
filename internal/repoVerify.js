import { spawn } from 'node:child_process'
import { rm } from 'node:fs/promises'
import path from 'node:path'
import { getAllProfiles, resolveProfile } from '#product'

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: process.env,
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

function parseArgs(rawArgs) {
  const options = {
    fast: false,
    profileIds: [],
    skipQuality: false,
  }

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (arg === '--fast') {
      options.fast = true
      continue
    }

    if (arg === '--skip-quality') {
      options.skipQuality = true
      continue
    }

    if (arg === '--profile') {
      const value = rawArgs[index + 1]

      if (value) {
        options.profileIds.push(value)
      }

      index += 1
      continue
    }

    if (arg?.startsWith('--profile=')) {
      options.profileIds.push(arg.slice('--profile='.length))
    }
  }

  return options
}

function getTargetProfiles(options) {
  if (options.profileIds.length > 0) {
    return options.profileIds.map((profileId) => resolveProfile(profileId))
  }

  const profiles = getAllProfiles().map((profile) => resolveProfile(profile.id))

  if (options.fast) {
    return profiles.filter((profile) => profile.id === 'default')
  }

  return profiles
}

async function verifyQualityGate(repoDir) {
  console.log('\n=== Repo quality gate ===')

  await run('pnpm', ['run', 'format:check'], repoDir)
  await run('pnpm', ['run', 'lint'], repoDir)
  await run('pnpm', ['run', 'typecheck'], repoDir)
}

export async function verifyRepo(rawArgs = process.argv.slice(2)) {
  const options = parseArgs(rawArgs)
  const repoDir = path.resolve(import.meta.dirname, '..')
  const tempRootDir = path.resolve(repoDir, '.tmp/verify/exports')
  const targetProfiles = getTargetProfiles(options)

  await rm(tempRootDir, { recursive: true, force: true })

  if (!options.skipQuality) {
    await verifyQualityGate(repoDir)
  }

  for (const profile of targetProfiles) {
    console.log(`\n=== Repo verify: ${profile.id} ===`)

    await run(
      'pnpm',
      ['run', 'verify:sub', '--', '--profile', profile.id],
      repoDir
    )

    const exportRelativeDir = `.tmp/verify/exports/${profile.id}`
    const exportDir = path.resolve(repoDir, exportRelativeDir)

    await run(
      'node',
      [
        './scripts/export.js',
        profile.id,
        '--output-dir',
        exportRelativeDir,
        '--force',
      ],
      repoDir
    )

    await run('pnpm', ['install'], exportDir)
    await run('pnpm', ['run', 'verify'], exportDir)
  }

  console.log('\nRepo verify passed')
}

await verifyRepo()
