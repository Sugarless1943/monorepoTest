import { readdir, rm } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'

const pageMap = {
  pagea: '../PageA',
  pageb: '../PageB',
  pagec: '../PageC',
  paged: '../PageD',
  pagee: '../PageE',
}

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    })

    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`))
    })
  })
}

const subDir = path.resolve(import.meta.dirname, '..')
const assetsDir = path.resolve(subDir, 'dist/assets')
const requestedPages = process.argv
  .slice(2)
  .filter((arg) => arg !== '--')
  .map((arg) => arg.toLowerCase())
  .filter(Boolean)

const targetPages =
  requestedPages.length === 0 ? Object.keys(pageMap) : requestedPages

for (const page of targetPages) {
  if (!pageMap[page]) {
    console.error(`Unknown page: ${page}`)
    process.exit(1)
  }
}

try {
  const files = await readdir(assetsDir)
  await Promise.all(
    files
      .filter((file) => /^index\d+\.(js|css)$/.test(file))
      .map((file) => rm(path.join(assetsDir, file), { force: true }))
  )
} catch {}

await run('pnpm', ['exec', 'vite', 'build'], subDir)

for (const page of targetPages) {
  await run('pnpm', ['build'], path.resolve(subDir, pageMap[page]))
}

await run('node', ['./scripts/check-dist.js', ...targetPages], subDir)
