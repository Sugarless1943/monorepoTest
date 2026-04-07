import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { pathExists, readJson } from '../lib/fs.js'

export function isWorkspaceVersion(value) {
  return typeof value === 'string' && value.startsWith('workspace:')
}

export function getWorkspaceDependencyNames(manifest) {
  return [
    ...Object.entries(manifest.dependencies ?? {}),
    ...Object.entries(manifest.devDependencies ?? {}),
    ...Object.entries(manifest.peerDependencies ?? {}),
    ...Object.entries(manifest.optionalDependencies ?? {}),
  ]
    .filter(([, version]) => isWorkspaceVersion(version))
    .map(([name]) => name)
}

async function getWorkspaceEntries(repoDir) {
  const workspaceEntries = []

  for (const workspaceRoot of ['apps', 'packages']) {
    const workspaceRootPath = path.resolve(repoDir, workspaceRoot)
    const items = await readdir(workspaceRootPath, { withFileTypes: true })

    for (const item of items) {
      if (!item.isDirectory()) {
        continue
      }

      const relativeDir = `${workspaceRoot}/${item.name}`
      const manifestPath = path.resolve(repoDir, relativeDir, 'package.json')

      if (!(await pathExists(manifestPath))) {
        continue
      }

      workspaceEntries.push({
        relativeDir,
        manifest: await readJson(manifestPath),
      })
    }
  }

  return {
    byRelativeDir: new Map(
      workspaceEntries.map((entry) => [entry.relativeDir, entry])
    ),
    byPackageName: new Map(
      workspaceEntries.map((entry) => [entry.manifest.name, entry])
    ),
  }
}

export async function collectExportPackageDirs({ repoDir, selectedAppDirs }) {
  const workspaceEntries = await getWorkspaceEntries(repoDir)
  const packageDirs = new Set()
  const visitedDirs = new Set()
  const queue = [...selectedAppDirs]

  while (queue.length > 0) {
    const relativeDir = queue.shift()

    if (visitedDirs.has(relativeDir)) {
      continue
    }

    visitedDirs.add(relativeDir)

    const workspaceEntry = workspaceEntries.byRelativeDir.get(relativeDir)

    if (!workspaceEntry) {
      continue
    }

    for (const dependencyName of getWorkspaceDependencyNames(
      workspaceEntry.manifest
    )) {
      const dependencyEntry = workspaceEntries.byPackageName.get(dependencyName)

      if (
        !dependencyEntry ||
        !dependencyEntry.relativeDir.startsWith('packages/')
      ) {
        continue
      }

      if (!packageDirs.has(dependencyEntry.relativeDir)) {
        packageDirs.add(dependencyEntry.relativeDir)
        queue.push(dependencyEntry.relativeDir)
      }
    }
  }

  return [...packageDirs].sort()
}

export async function collectExportPackageNames({ repoDir, packageDirs }) {
  return new Set(
    (
      await Promise.all(
        packageDirs.map(async (packageDir) => {
          const manifest = await readJson(
            path.resolve(repoDir, packageDir, 'package.json')
          )
          return manifest.name
        })
      )
    ).filter(Boolean)
  )
}
