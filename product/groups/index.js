import groupA from './group-a.js'
import groupB from './group-b.js'
import groupC from './group-c.js'

const groups = [groupA, groupB, groupC]

function assertUniqueGroups() {
  const seenSlugs = new Set()

  for (const group of groups) {
    if (seenSlugs.has(group.slug)) {
      throw new Error(`Duplicate group slug: ${group.slug}`)
    }

    seenSlugs.add(group.slug)
  }
}

assertUniqueGroups()

const groupsBySlug = Object.freeze(
  Object.fromEntries(groups.map((group) => [group.slug, group]))
)

export function getAllGroups() {
  return groups.slice()
}

export function getGroup(slug) {
  const group = groupsBySlug[slug]

  if (!group) {
    throw new Error(`Unknown group slug: ${slug}`)
  }

  return group
}

export function listGroupAssetFileNames(targetGroups = groups) {
  return targetGroups.map((group) => group.chunkFileName)
}

export { groups, groupsBySlug }
