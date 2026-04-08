import { spawn } from 'node:child_process'
import http from 'node:http'
import { createServer } from 'node:net'
import path from 'node:path'
import { resolveBuildPlan } from '#product'
import { parseProductArgs } from './lib/args.js'

function run(command, args, cwd, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
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

function start(command, args, cwd) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    shell: true,
  })

  return child
}

async function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer()

    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()

      if (!address || typeof address === 'string') {
        reject(new Error('Failed to acquire preview port'))
        return
      }

      const { port } = address
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }

        resolve(port)
      })
    })
  })
}

async function waitForUrl(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = await new Promise((resolve, reject) => {
        const request = http.get(url, resolve)
        request.on('error', reject)
      })

      if (
        response.statusCode &&
        response.statusCode >= 200 &&
        response.statusCode < 300
      ) {
        return response
      }
    } catch {}

    await new Promise((resolve) => {
      setTimeout(resolve, 300)
    })
  }

  throw new Error(`Timed out waiting for ${url}`)
}

async function assertPageResponse(url) {
  const response = await waitForUrl(url)
  const body = await new Promise((resolve, reject) => {
    let text = ''

    response.setEncoding('utf8')
    response.on('data', (chunk) => {
      text += chunk
    })
    response.on('end', () => resolve(text))
    response.on('error', reject)
  })

  if (!body.includes('<div id="app">')) {
    throw new Error(`Unexpected preview response for ${url}`)
  }
}

function collectPreviewPaths({ profile, targetPages }) {
  const paths = ['/']
  const selectedPageSlugs = new Set(targetPages.map((page) => page.slug))

  for (const page of targetPages) {
    paths.push(page.routePath)
  }

  for (const legacyRoute of profile.legacyRoutes) {
    if (selectedPageSlugs.has(legacyRoute.slug)) {
      paths.push(legacyRoute.path)
    }
  }

  return [...new Set(paths)]
}

async function verifyPreview({ subDir, profile, targetPages }) {
  const port = await getAvailablePort()
  const baseUrl = `http://127.0.0.1:${port}`
  const previewProcess = start(
    'pnpm',
    [
      'exec',
      'vite',
      'preview',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    subDir
  )

  try {
    for (const routePath of collectPreviewPaths({ profile, targetPages })) {
      await assertPageResponse(`${baseUrl}${routePath}`)
    }
  } finally {
    previewProcess.kill('SIGTERM')
    await new Promise((resolve) => {
      previewProcess.once('exit', () => resolve())
      setTimeout(() => {
        previewProcess.kill('SIGKILL')
        resolve()
      }, 2000)
    })
  }
}

export async function verifySub(rawArgs = process.argv.slice(2)) {
  const subDir = path.resolve(import.meta.dirname, '..')
  const { profileId, selectors } = parseProductArgs(rawArgs)
  const { profile, pages: targetPages } = resolveBuildPlan({
    profileId,
    selectors,
  })

  console.log(
    `Verifying Sub for profile ${profile.id} (${targetPages
      .map((page) => page.slug)
      .join(', ')})`
  )

  await run(
    'node',
    [
      './scripts/build.js',
      '--profile',
      profile.id,
      ...targetPages.map((page) => page.slug),
    ],
    subDir
  )

  await run(
    'node',
    [
      './scripts/check-dist.js',
      '--profile',
      profile.id,
      ...targetPages.map((page) => page.slug),
    ],
    subDir
  )

  await verifyPreview({ subDir, profile, targetPages })

  console.log(`Sub verify passed for profile ${profile.id}`)
}

await verifySub()
