import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import {
  renderLeafProductIndex,
  renderLeafResolver,
  renderPagesIndex,
} from './render.js'

const PRODUCT_CORE_FILES = ['case.js', 'definePage.js']

function toPosixPath(value) {
  return value.split(path.sep).join('/')
}

function toModulePath(fromDir, targetPath) {
  const relativePath = toPosixPath(path.relative(fromDir, targetPath))
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
}

async function copyProductCoreFiles({ repoDir, productDir }) {
  await Promise.all(
    PRODUCT_CORE_FILES.map((fileName) =>
      cp(
        path.resolve(repoDir, 'product', fileName),
        path.resolve(productDir, fileName)
      )
    )
  )
}

async function copyPageFiles({ repoDir, pagesDir, pages }) {
  await Promise.all(
    pages.map((page) =>
      cp(
        path.resolve(repoDir, 'product/pages', `${page.slug}.js`),
        path.resolve(pagesDir, `${page.slug}.js`)
      )
    )
  )
}

export async function rewriteProductFiles({ repoDir, exportDir, plan }) {
  const pageSlugs = plan.profile.pageSlugs
  const productDir = path.resolve(exportDir, 'apps/Sub/product')
  const pagesDir = path.resolve(productDir, 'pages')

  await rm(productDir, { recursive: true, force: true })
  await mkdir(pagesDir, { recursive: true })
  await copyProductCoreFiles({ repoDir, productDir })
  await copyPageFiles({ repoDir, pagesDir, pages: plan.pages })

  await writeFile(
    path.resolve(productDir, 'index.js'),
    renderLeafProductIndex()
  )
  await writeFile(
    path.resolve(productDir, 'resolver.js'),
    renderLeafResolver(plan.displayName, pageSlugs)
  )
  await writeFile(
    path.resolve(pagesDir, 'index.js'),
    renderPagesIndex(plan.pages)
  )
}

export async function rewritePageProductImports({ exportDir, pages }) {
  const productIndexPath = path.resolve(exportDir, 'apps/Sub/product/index.js')

  await Promise.all(
    pages.map((page) => {
      const importFilePath = path.resolve(
        exportDir,
        page.appDir,
        '.imports/product.js'
      )
      const importFileDir = path.dirname(importFilePath)
      const productModulePath = toModulePath(importFileDir, productIndexPath)

      return writeFile(importFilePath, `export * from '${productModulePath}'\n`)
    })
  )
}
