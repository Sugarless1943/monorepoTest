import { access, cp, rm } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

function resolveRepoDir() {
  return path.resolve(import.meta.dirname, '..')
}

export async function syncSubDist(repoDir = resolveRepoDir()) {
  const sourceDir = path.resolve(repoDir, 'apps/Sub/dist')
  const targetDir = path.resolve(repoDir, 'dist')

  await access(sourceDir)

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await rm(targetDir, { recursive: true, force: true })

    try {
      await cp(sourceDir, targetDir, { recursive: true })
      return
    } catch (error) {
      if (error?.code !== 'EEXIST' || attempt === 1) {
        throw error
      }
    }
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await syncSubDist()
  console.log('Synced apps/Sub/dist to dist')
}
