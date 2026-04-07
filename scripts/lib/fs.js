import { access, readFile, writeFile } from 'node:fs/promises'

export async function pathExists(targetPath) {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

export async function readJson(targetPath) {
  return JSON.parse(await readFile(targetPath, 'utf8'))
}

export async function writeJson(targetPath, value) {
  await writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`)
}
