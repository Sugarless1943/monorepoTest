import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { resolveExportPlan } from '../../product/index.js'
import { pathExists } from '../lib/fs.js'
import { parseExportArgs } from './args.js'
import { ROOT_FILES_TO_COPY, ROOT_SUPPORT_DIRS } from './constants.js'
import { copyDirectory, copyFileIfExists } from './copy.js'
import { rewriteRootPackage, rewriteSubPackage } from './package.js'
import { rewriteProductFiles } from './product.js'
import { writeExportArtifacts } from './artifacts.js'
import {
  collectExportPackageDirs,
  collectExportPackageNames,
} from './workspace.js'

const repoDir = path.resolve(import.meta.dirname, '../..')

function toRelativePath(targetPath) {
  return path.relative(repoDir, targetPath).replaceAll(path.sep, '/')
}

export async function runExport(rawArgs = process.argv.slice(2)) {
  const args = parseExportArgs(rawArgs)
  const plan = resolveExportPlan({
    profileId: args.profileId,
    projectSlug: args.projectSlug,
    displayName: args.displayName,
    outputDir:
      args.outputDir ?? `exports/${args.projectSlug ?? args.profileId}`,
  })
  const exportDir = path.resolve(repoDir, plan.outputDir)

  if (await pathExists(exportDir)) {
    if (!args.force) {
      throw new Error(
        `Export target already exists: ${toRelativePath(exportDir)}. Use --force to overwrite.`
      )
    }

    await rm(exportDir, { recursive: true, force: true })
  }

  await mkdir(exportDir, { recursive: true })

  const selectedAppDirs = ['apps/Sub', ...plan.pages.map((page) => page.appDir)]
  const packageDirs = await collectExportPackageDirs({
    repoDir,
    selectedAppDirs,
  })

  for (const relativePath of ROOT_FILES_TO_COPY) {
    await copyFileIfExists({ repoDir, relativePath, exportDir })
  }

  for (const relativeDir of [
    ...ROOT_SUPPORT_DIRS,
    ...selectedAppDirs,
    ...packageDirs,
  ]) {
    await copyDirectory({ repoDir, relativePath: relativeDir, exportDir })
  }

  const exportPackageNames = await collectExportPackageNames({
    repoDir,
    packageDirs,
  })

  await rewriteRootPackage({ repoDir, exportDir, plan })
  await rewriteSubPackage({ exportDir, plan, exportPackageNames })
  await rewriteProductFiles({ exportDir, plan })
  await writeExportArtifacts({ repoDir, exportDir, plan, packageDirs })

  console.log(`Exported ${plan.profile.id} to ${toRelativePath(exportDir)}`)
}
