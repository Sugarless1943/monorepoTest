function normalizeList(values) {
  if (!values) {
    return undefined
  }

  return [...new Set(values.filter(Boolean))]
}

export function defineProfile(id, options = {}) {
  if (!id) {
    throw new Error('Profile id is required')
  }

  if (options.pages && options.groups) {
    throw new Error(`Profile ${id} cannot define both pages and groups`)
  }

  return Object.freeze({
    id,
    extends: options.extends ?? null,
    displayName: options.displayName ?? null,
    pages: normalizeList(options.pages),
    groups: normalizeList(options.groups),
    runtimeConfig: Object.freeze({ ...(options.runtimeConfig ?? {}) }),
  })
}
