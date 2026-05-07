import { profilesById } from '#product'

export function parseExportArgs(rawArgs) {
  const positional = []
  const options = {
    force: false,
    outputDir: undefined,
    displayName: undefined,
  }
  let profileId =
    process.env.PRODUCT_PROFILE?.trim() ||
    process.env.VITE_PRODUCT_PROFILE?.trim() ||
    'default'
  let explicitProfile = false

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (!arg || arg === '--') {
      continue
    }

    if (arg === '--force') {
      options.force = true
      continue
    }

    if (arg === '--profile') {
      profileId = rawArgs[index + 1]?.trim() || profileId
      explicitProfile = true
      index += 1
      continue
    }

    if (arg.startsWith('--profile=')) {
      profileId = arg.slice('--profile='.length).trim() || profileId
      explicitProfile = true
      continue
    }

    if (arg === '--output-dir') {
      options.outputDir = rawArgs[index + 1]
      index += 1
      continue
    }

    if (arg.startsWith('--output-dir=')) {
      options.outputDir = arg.slice('--output-dir='.length)
      continue
    }

    if (arg === '--display-name') {
      options.displayName = rawArgs[index + 1]
      index += 1
      continue
    }

    if (arg.startsWith('--display-name=')) {
      options.displayName = arg.slice('--display-name='.length)
      continue
    }

    positional.push(arg)
  }

  if (
    !explicitProfile &&
    positional.length > 0 &&
    profilesById[positional[0]]
  ) {
    profileId = positional.shift()
  }

  return {
    profileId,
    projectSlug: positional[0],
    displayName: options.displayName ?? positional[1],
    outputDir: options.outputDir,
    force: options.force,
  }
}
