import { spawn } from 'node:child_process'
import path from 'node:path'
import { syncSubDist } from './syncSubDist.js'

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
      env: process.env,
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

function normalizeForwardArgs(args) {
  if (args[0] === '--') {
    return args.slice(1)
  }

  return args
}

const [scriptName, ...rawForwardArgs] = process.argv.slice(2)

if (!scriptName) {
  throw new Error('Missing Sub package script name')
}

const repoDir = path.resolve(import.meta.dirname, '..')
const subDir = path.resolve(repoDir, 'apps/Sub')
const forwardArgs = normalizeForwardArgs(rawForwardArgs)
const pnpmArgs = ['run', scriptName]

if (forwardArgs.length > 0) {
  pnpmArgs.push('--', ...forwardArgs)
}

await run('pnpm', pnpmArgs, subDir)

if (scriptName === 'build' || scriptName.startsWith('build:')) {
  await syncSubDist(repoDir)
}
