import { toCamelCase, toPascalCase } from './case.js'

function normalizeAliases(values) {
  return [...new Set((values ?? []).filter(Boolean))]
}

export function definePage(slug, options = {}) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new Error(`Invalid page slug: ${slug}`)
  }

  const pascalName = options.pascalName ?? toPascalCase(slug)
  const camelName = options.camelName ?? toCamelCase(slug)
  const routePath = options.routePath ?? `/${slug}`
  const legacyRoutePath = options.legacyRoutePath ?? `/${camelName}`
  const aliases = normalizeAliases(
    [legacyRoutePath, ...(options.aliases ?? [])].filter(
      (value) => value && value !== routePath
    )
  )

  return Object.freeze({
    slug,
    title: options.title ?? pascalName,
    menuLabel: options.menuLabel ?? options.title ?? pascalName,
    order: options.order ?? 0,
    visibleInMenu: options.visibleInMenu ?? true,
    routePath,
    routeName: options.routeName ?? slug,
    aliases,
    pascalName,
    camelName,
    chunkFileName: options.chunkFileName ?? `${slug}.js`,
    packageName: options.packageName ?? `@monorepo/${slug}`,
    appDir: options.appDir ?? `apps/${pascalName}`,
    entryFile: options.entryFile ?? 'src/index.ts',
    componentFile: options.componentFile ?? 'src/index.vue',
    libName: options.libName ?? pascalName,
  })
}
