import pageA from './page-a.js'
import pageB from './page-b.js'
import pageC from './page-c.js'
import pageD from './page-d.js'
import pageE from './page-e.js'
import pageF from './page-f.js'

const pages = [pageA, pageB, pageC, pageD, pageE, pageF]

function normalizeSelector(value) {
  return String(value ?? '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/\.js$/i, '')
    .toLowerCase()
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))]
}

function createPageReferenceKeys(page) {
  const appDirName = page.appDir.split('/').pop()

  return uniqueValues(
    [
      page.slug,
      page.camelName,
      page.pascalName,
      page.routeName,
      page.routePath,
      page.chunkFileName,
      appDirName,
      page.slug.replace(/-/g, ''),
    ].map(normalizeSelector)
  )
}

function assertUniquePages() {
  const seenSlugs = new Set()

  for (const page of pages) {
    if (seenSlugs.has(page.slug)) {
      throw new Error(`Duplicate page slug: ${page.slug}`)
    }

    seenSlugs.add(page.slug)
  }
}

assertUniquePages()

const pagesBySlug = Object.freeze(
  Object.fromEntries(pages.map((page) => [page.slug, page]))
)

export function getAllPages() {
  return pages.slice()
}

export function getPage(slug) {
  const page = pagesBySlug[slug]

  if (!page) {
    throw new Error(`Unknown page slug: ${slug}`)
  }

  return page
}

export function listPageAssetFileNames(targetPages = pages) {
  return targetPages.flatMap((page) => [
    page.chunkFileName,
    page.chunkFileName.replace(/\.js$/, '.css'),
  ])
}

export function resolvePageSelectors(selectors, availablePages = pages) {
  if (!selectors?.length) {
    return availablePages.slice()
  }

  const referenceMap = new Map()

  for (const page of availablePages) {
    for (const key of createPageReferenceKeys(page)) {
      if (referenceMap.has(key) && referenceMap.get(key).slug !== page.slug) {
        throw new Error(`Ambiguous page selector key: ${key}`)
      }

      referenceMap.set(key, page)
    }
  }

  const selectedSlugs = new Set()

  for (const selector of selectors) {
    const key = normalizeSelector(selector)
    const page = referenceMap.get(key)

    if (!page) {
      throw new Error(`Unknown page selector: ${selector}`)
    }

    selectedSlugs.add(page.slug)
  }

  return availablePages.filter((page) => selectedSlugs.has(page.slug))
}

export { pages, pagesBySlug }
