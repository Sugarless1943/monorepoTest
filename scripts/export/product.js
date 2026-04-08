import { readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  renderDefaultProfile,
  renderPagesIndex,
  renderProfilesIndex,
} from './render.js'

export async function rewriteProductFiles({ exportDir, plan }) {
  const pageSlugs = plan.profile.pageSlugs
  const productDir = path.resolve(exportDir, 'apps/Sub/product')
  const pagesDir = path.resolve(productDir, 'pages')
  const profilesDir = path.resolve(productDir, 'profiles')

  for (const pageFileName of await readdir(pagesDir)) {
    if (
      pageFileName === 'index.js' ||
      pageSlugs.includes(pageFileName.replace(/\.js$/, ''))
    ) {
      continue
    }

    await rm(path.resolve(pagesDir, pageFileName), { force: true })
  }

  for (const profileFileName of await readdir(profilesDir)) {
    if (profileFileName === 'default.js' || profileFileName === 'index.js') {
      continue
    }

    await rm(path.resolve(profilesDir, profileFileName), { force: true })
  }

  await writeFile(
    path.resolve(pagesDir, 'index.js'),
    renderPagesIndex(plan.pages)
  )
  await writeFile(
    path.resolve(profilesDir, 'default.js'),
    renderDefaultProfile(plan.displayName, pageSlugs)
  )
  await writeFile(path.resolve(profilesDir, 'index.js'), renderProfilesIndex())
}
