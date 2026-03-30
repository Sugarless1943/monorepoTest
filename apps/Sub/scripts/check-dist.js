import { access } from 'node:fs/promises'
import path from 'node:path'

const subDir = path.resolve(import.meta.dirname, '..')
const distDir = path.resolve(subDir, 'dist')
const pageArgs = process.argv
  .slice(2)
  .filter((arg) => arg !== '--')
  .map((arg) => arg.toLowerCase())

const allPages = ['pagea', 'pageb', 'pagec', 'paged', 'pagee']
const targetPages = pageArgs.length === 0 ? allPages : pageArgs

function pageToChunk(page) {
  return `page-${page.slice(-1)}.js`
}

const requiredFiles = [
  path.resolve(distDir, 'index.html'),
  path.resolve(distDir, 'assets/index.js'),
  path.resolve(distDir, 'assets/vendor.js'),
  path.resolve(distDir, 'shared/vue-runtime.js'),
  ...targetPages.map((page) =>
    path.resolve(distDir, 'assets', pageToChunk(page))
  ),
]

for (const file of requiredFiles) {
  try {
    await access(file)
  } catch {
    console.error(`Missing build artifact: ${file}`)
    process.exit(1)
  }
}

console.log(`Verified dist artifacts for: ${targetPages.join(', ')}`)
