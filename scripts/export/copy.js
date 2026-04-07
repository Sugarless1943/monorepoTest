import { cp, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { pathExists } from '../lib/fs.js'

function createCopyFilter() {
  const ignoredNames = new Set(['node_modules', 'dist', '.DS_Store', '.vscode'])

  return (source) => !ignoredNames.has(path.basename(source))
}

export async function copyFileIfExists({ repoDir, relativePath, exportDir }) {
  const sourcePath = path.resolve(repoDir, relativePath)

  if (!(await pathExists(sourcePath))) {
    return
  }

  const targetPath = path.resolve(exportDir, relativePath)
  await mkdir(path.dirname(targetPath), { recursive: true })
  await cp(sourcePath, targetPath)
}

export async function copyDirectory({ repoDir, relativePath, exportDir }) {
  await cp(
    path.resolve(repoDir, relativePath),
    path.resolve(exportDir, relativePath),
    {
      recursive: true,
      filter: createCopyFilter(),
    }
  )
}
