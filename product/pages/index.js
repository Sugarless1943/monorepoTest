import page1 from './page-1.js'
import page2 from './page-2.js'
import page3 from './page-3.js'
import page4 from './page-4.js'
import page5 from './page-5.js'
import page6 from './page-6.js'
import tempPage from './temp-page.js'

import { getAllGroups, getGroup } from '../groups/index.js'

const pages = [page1, page2, page3, page4, page5, page6, tempPage]

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
  return uniqueValues(
    [
      page.slug,
      page.camelName,
      page.pascalName,
      page.routeName,
      page.routePath,
      page.slug.replace(/-/g, ''),
    ].map(normalizeSelector)
  )
}

function createGroupReferenceKeys(group) {
  return uniqueValues(
    [group.slug, group.title, group.slug.replace(/-/g, '')].map(
      normalizeSelector
    )
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
  return [
    ...new Set(
      targetPages.map((page) => getGroup(page.groupSlug).chunkFileName)
    ),
  ]
}

export function resolvePageSelectors(selectors, availablePages = pages) {
  if (!selectors?.length) {
    return availablePages.slice()
  }

  const pageReferenceMap = new Map()
  const groupReferenceMap = new Map()
  const availablePageSlugs = new Set(availablePages.map((page) => page.slug))

  for (const page of availablePages) {
    for (const key of createPageReferenceKeys(page)) {
      if (
        pageReferenceMap.has(key) &&
        pageReferenceMap.get(key).slug !== page.slug
      ) {
        throw new Error(`Ambiguous page selector key: ${key}`)
      }

      pageReferenceMap.set(key, page)
    }
  }

  for (const group of getAllGroups()) {
    const groupPages = availablePages.filter(
      (page) =>
        page.groupSlug === group.slug && availablePageSlugs.has(page.slug)
    )

    if (groupPages.length === 0) {
      continue
    }

    for (const key of createGroupReferenceKeys(group)) {
      if (
        groupReferenceMap.has(key) &&
        groupReferenceMap.get(key).slug !== group.slug
      ) {
        throw new Error(`Ambiguous group selector key: ${key}`)
      }

      groupReferenceMap.set(key, group)
    }
  }

  const selectedSlugs = new Set()

  for (const selector of selectors) {
    const key = normalizeSelector(selector)
    const page = pageReferenceMap.get(key)

    if (page) {
      selectedSlugs.add(page.slug)
      continue
    }

    const group = groupReferenceMap.get(key)

    if (!group) {
      throw new Error(`Unknown page/group selector: ${selector}`)
    }

    for (const pageSlug of group.pageSlugs) {
      if (availablePageSlugs.has(pageSlug)) {
        selectedSlugs.add(pageSlug)
      }
    }
  }

  return availablePages.filter((page) => selectedSlugs.has(page.slug))
}

export { pages, pagesBySlug }
