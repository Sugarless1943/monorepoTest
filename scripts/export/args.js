export function parseExportArgs(rawArgs) {
  const positional = []
  const options = {
    force: false,
    outputDir: undefined,
    displayName: undefined,
  }

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index]

    if (!arg || arg === '--') {
      continue
    }

    if (arg === '--force') {
      options.force = true
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

  return {
    profileId: positional[0] ?? 'default',
    projectSlug: positional[1],
    displayName: options.displayName ?? positional[2],
    outputDir: options.outputDir,
    force: options.force,
  }
}
