import { execSync } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { writeJson } from '../lib/fs.js'
import { renderExportReadme } from './render.js'

function getGitValue(command, repoDir) {
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

export async function writeExportArtifacts({
  repoDir,
  exportDir,
  plan,
  packageDirs,
}) {
  const sourceRepo = getGitValue('git config --get remote.origin.url', repoDir)
  const sourceRevision = getGitValue('git rev-parse HEAD', repoDir)
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
      groups: plan.profile.groups,
      packageDirs,
      sourceRepo,
      sourceRevision,
    })
  )
}
