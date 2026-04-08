function capitalize(value) {
  if (!value) {
    return ''
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function splitSlug(slug) {
  return String(slug)
    .trim()
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function toPascalCase(slug) {
  return splitSlug(slug).map(capitalize).join('')
}

export function toCamelCase(slug) {
  const pascalCase = toPascalCase(slug)

  if (!pascalCase) {
    return ''
  }

  return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1)
}
