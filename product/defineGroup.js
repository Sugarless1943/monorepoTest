import { toPascalCase } from './case.js'

function normalizePageSlugs(pageSlugs) {
  return [...new Set((pageSlugs ?? []).filter(Boolean))]
}

export function defineGroup(slug, options = {}) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Invalid group slug: ${slug}`)
  }

  return Object.freeze({
    slug,
    title: options.title ?? slug,
    order: options.order ?? 0,
    pageSlugs: normalizePageSlugs(options.pageSlugs),
    chunkFileName: options.chunkFileName ?? `${slug}.js`,
    appDir: options.appDir ?? `apps/${toPascalCase(options.title ?? slug)}`,
    packageName: options.packageName ?? `@monorepo/${slug}`,
    temporary: options.temporary ?? false,
  })
}
