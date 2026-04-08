function normalizePages(pages) {
  if (!pages) {
    return undefined
  }

  return [...new Set(pages.filter(Boolean))]
}

export function defineProfile(id, options = {}) {
  if (!id) {
    throw new Error('Profile id is required')
  }

  return Object.freeze({
    id,
    extends: options.extends ?? null,
    displayName: options.displayName ?? null,
    pages: normalizePages(options.pages),
    runtimeConfig: Object.freeze({ ...(options.runtimeConfig ?? {}) }),
  })
}
