export function parseProductArgs(rawArgs) {
  const args = rawArgs.filter((arg) => arg !== '--')
  const selectors = []
  let profileId =
    process.env.PRODUCT_PROFILE?.trim() ||
    process.env.VITE_PRODUCT_PROFILE?.trim() ||
    'default'

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]

    if (arg === '--profile') {
      profileId = args[index + 1]?.trim() || profileId
      index += 1
      continue
    }

    if (arg.startsWith('--profile=')) {
      profileId = arg.slice('--profile='.length).trim() || profileId
      continue
    }

    selectors.push(arg)
  }

  return {
    profileId,
    selectors,
  }
}
