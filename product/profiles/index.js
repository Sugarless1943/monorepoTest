import customerA from './customer-a.js'
import customerB from './customer-b.js'
import defaultProfile from './default.js'

const profiles = [defaultProfile, customerA, customerB]

function assertUniqueProfiles() {
  const seenIds = new Set()

  for (const profile of profiles) {
    if (seenIds.has(profile.id)) {
      throw new Error(`Duplicate profile id: ${profile.id}`)
    }

    seenIds.add(profile.id)
  }
}

assertUniqueProfiles()

const profilesById = Object.freeze(
  Object.fromEntries(profiles.map((profile) => [profile.id, profile]))
)

export function getProfile(profileId) {
  const profile = profilesById[profileId]

  if (!profile) {
    throw new Error(`Unknown profile id: ${profileId}`)
  }

  return profile
}

export function getAllProfiles() {
  return profiles.slice()
}

export { profiles, profilesById }
