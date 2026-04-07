import path from 'node:path'
import { readJson, writeJson } from '../lib/fs.js'
import { ROOT_DEV_DEPENDENCIES } from './constants.js'
import { isWorkspaceVersion } from './workspace.js'

function pickDependencies(source, names) {
  const result = {}

  for (const name of names) {
    if (source?.[name]) {
      result[name] = source[name]
    }
  }

  return result
}

function filterWorkspaceDependencies(
  dependencies,
  allowedWorkspacePackageNames
) {
  const result = {}

  for (const [name, version] of Object.entries(dependencies ?? {})) {
    if (
      !isWorkspaceVersion(version) ||
      allowedWorkspacePackageNames.has(name)
    ) {
      result[name] = version
    }
  }

  return result
}

export function createPageBuildScripts(pages, baseRelativeDir) {
  return Object.fromEntries(
    pages.map((page) => {
      const appDirName = path.basename(page.appDir)
      return [
        `build:${page.camelName}`,
        `cd ${baseRelativeDir}${appDirName} && pnpm build`,
      ]
    })
  )
}

export async function rewriteRootPackage({ repoDir, exportDir, plan }) {
  const sourcePackage = await readJson(path.resolve(repoDir, 'package.json'))
  const targetPackage = {
    name: plan.projectSlug,
    private: true,
    version: sourcePackage.version,
    description: plan.displayName,
    type: sourcePackage.type,
    packageManager: sourcePackage.packageManager,
    engines: sourcePackage.engines,
    scripts: {
      start: 'node ./scripts/runSubPackageScript.js dev',
      dev: 'node ./scripts/runSubPackageScript.js dev',
      build: 'node ./scripts/runSubPackageScript.js build',
      'build:sub': 'node ./scripts/runSubPackageScript.js build',
      'build:host': 'node ./scripts/runSubPackageScript.js build:host',
      'check:dist': 'node ./scripts/runSubPackageScript.js check:dist',
      verify: 'node ./scripts/runSubPackageScript.js verify',
      'verify:sub': 'node ./scripts/runSubPackageScript.js verify',
      preview: 'node ./scripts/runSubPackageScript.js preview',
      ...Object.fromEntries(
        Object.entries(createPageBuildScripts(plan.pages, 'apps/')).map(
          ([scriptName]) => [
            scriptName,
            `node ./scripts/runSubPackageScript.js ${scriptName}`,
          ]
        )
      ),
    },
    devDependencies: pickDependencies(
      sourcePackage.devDependencies,
      ROOT_DEV_DEPENDENCIES
    ),
  }

  await writeJson(path.resolve(exportDir, 'package.json'), targetPackage)
}

export async function rewriteSubPackage({
  exportDir,
  plan,
  exportPackageNames,
}) {
  const packagePath = path.resolve(exportDir, 'apps/Sub/package.json')
  const sourcePackage = await readJson(packagePath)
  const targetPackage = {
    ...sourcePackage,
    scripts: {
      dev: 'vite',
      build: 'node ../../scripts/build.js',
      ...createPageBuildScripts(plan.pages, '../'),
      'build:host': 'pnpm exec vite build',
      'check:dist': 'node ../../scripts/check-dist.js',
      verify: 'node ../../scripts/verify/sub.js',
      preview: 'vite preview',
    },
    dependencies: filterWorkspaceDependencies(
      sourcePackage.dependencies,
      exportPackageNames
    ),
  }

  await writeJson(packagePath, targetPackage)
}
