/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { getActiveTest } from '@japa/runner'
import { createServer, type InlineConfig, type Plugin, type ViteDevServer } from 'vite'

import { defineConfig, Vite } from '../../index.ts'
import { type ViteOptions } from '../../src/types.ts'

export const BASE_URL = new URL('./../__app/', import.meta.url)

/**
 * Create an instance of AdonisJS Vite class, run the dev server
 * and auto close it when the test ends
 */
export async function createVite(config: ViteOptions, viteConfig: InlineConfig = {}) {
  const test = getActiveTest()
  if (!test) {
    throw new Error('Cannot create vite instance outside of a test')
  }

  /**
   * Create a dummy file to ensure the root directory exists
   * otherwise Vite will throw an error
   */
  await test.context.fs.create('dummy.txt', 'dummy')

  const vite = new Vite(config)
  await vite.createDevServer({
    logLevel: 'silent',
    clearScreen: false,
    root: test.context.fs.basePath,
    ...viteConfig,
  })

  test.cleanup(() => vite.stopDevServer())

  return vite
}

export async function setupViteWithManifest(config?: Partial<ViteOptions>) {
  const test = getActiveTest()
  if (!test) throw new Error('Cannot create vite instance outside of a test')

  await test.context.fs.create('public/assets/.vite/manifest.json', '')

  const defaultManifestPath = join(test.context.fs.basePath, 'public/assets/.vite/manifest.json')
  const vite = new Vite(defineConfig(config || { manifestFile: defaultManifestPath }))

  return vite
}

/**
 * Boot a raw Vite dev server in middleware mode at the given root, with the
 * supplied plugin chain. Captures every WS message sent by the server into
 * `sent`. The server is auto-closed when the active test ends.
 */
export async function bootDevServer(
  root: string,
  plugins: Plugin[]
): Promise<{ server: ViteDevServer; sent: any[] }> {
  const test = getActiveTest()
  if (!test) throw new Error('Cannot boot dev server outside of a test')

  const sent: any[] = []
  const server = await createServer({
    root,
    logLevel: 'silent',
    clearScreen: false,
    appType: 'custom',
    server: { middlewareMode: true },
    plugins,
  })

  const originalSend = server.ws.send.bind(server.ws)
  server.ws.send = ((...args: any[]) => {
    sent.push(args[0])
    return originalSend(...(args as Parameters<typeof originalSend>))
  }) as typeof server.ws.send

  test.cleanup(() => server.close())

  /**
   * chokidar's add() is sync but scans newly-added paths asynchronously.
   * Wait briefly so the watcher is settled before tests start writing files.
   */
  await new Promise((r) => setTimeout(r, 250))

  return { server, sent }
}

/**
 * Poll `sent` until a `full-reload` WS message is observed, or reject after
 * `ms` milliseconds.
 */
export function waitForReload(sent: any[], ms = 1500): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const timer = setInterval(() => {
      if (sent.some((m) => m && m.type === 'full-reload')) {
        clearInterval(timer)
        resolve()
        return
      }
      if (Date.now() - start > ms) {
        clearInterval(timer)
        reject(new Error('Timed out waiting for full-reload'))
      }
    }, 20)
  })
}
