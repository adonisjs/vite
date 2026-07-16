/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import string from '@poppinss/utils/string'
import { join } from 'node:path'

import { Vite } from '../../index.ts'
import { createVite } from './helpers.ts'
import adonisjs from '../../src/client/main.ts'
import { defineConfig } from '../../src/define_config.ts'

test.group('Vite dev server', () => {
  test('createDevServer boots in middleware mode and exposes server', async ({ assert }) => {
    const vite = await createVite(defineConfig({}))

    const server = vite.getDevServer()
    assert.exists(server)
    assert.equal(server!.config.appType, 'custom')
    assert.equal(server!.config.server.middlewareMode, true)
  })

  test('useDevServer reflects whether server is booted', async ({ fs, assert, cleanup }) => {
    const vite = new Vite(defineConfig({ buildDirectory: 'foo', manifestFile: 'bar.json' }))
    assert.isFalse(vite.useDevServer)

    await fs.create('dummy.txt', 'dummy')
    await vite.createDevServer({
      logLevel: 'silent',
      clearScreen: false,
      root: fs.basePath,
    })
    cleanup(() => vite.stopDevServer())

    assert.isTrue(vite.useDevServer)
  })

  test('VITE_HMR_PORT env is forwarded to server.config.server.hmr.port', async ({
    assert,
    cleanup,
  }) => {
    process.env.VITE_HMR_PORT = '24999'
    cleanup(() => {
      delete process.env.VITE_HMR_PORT
    })

    const vite = await createVite(defineConfig({}))
    const server = vite.getDevServer()!
    assert.deepInclude(server.config.server.hmr, { port: 24999 })
  })

  test('moduleGraph exposes warmed-up entries via getModuleById', async ({ fs, assert }) => {
    await fs.create('foo.ts', `import './style.css'`)
    await fs.create('style.css', 'body { color: red }')

    const vite = await createVite(defineConfig({}), {
      build: { rolldownOptions: { input: 'foo.ts' } },
    })

    const server = vite.getDevServer()!
    await server.warmupRequest('/foo.ts')

    const filePath = string.toUnixSlash(join(fs.basePath, 'foo.ts'))
    const mod = server.moduleGraph.getModuleById(filePath)

    assert.exists(mod, 'expected entry module to be in graph after warmup')
    assert.isAbove(server.moduleGraph.idToModuleMap.size, 0)
  })

  test('server.environments exposes ssr and client environments', async ({ assert }) => {
    const vite = await createVite(defineConfig({}))
    const server = vite.getDevServer()!

    assert.exists(server.environments.ssr)
    assert.exists(server.environments.client)
  })

  test('server.middlewares is a Connect-compatible app', async ({ assert }) => {
    const vite = await createVite(defineConfig({}))
    const server = vite.getDevServer()!

    assert.isFunction(server.middlewares.handle)
    assert.isFunction(server.middlewares.use)
  })

  test('stopDevServer closes cleanly without throw', async ({ fs }) => {
    const vite = new Vite(defineConfig({ buildDirectory: 'foo', manifestFile: 'bar.json' }))
    await fs.create('dummy.txt', 'dummy')
    await vite.createDevServer({ logLevel: 'silent', clearScreen: false, root: fs.basePath })

    await vite.stopDevServer()
  })

  test('createDevServer accepts adonisjs plugin and resolves rolldownOptions input', async ({
    fs,
    assert,
  }) => {
    await fs.create('resources/js/app.ts', 'console.log("ok")')

    const vite = await createVite(defineConfig({}), {
      plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })],
    })

    const server = vite.getDevServer()!
    const input = (server.config.build as any).rolldownOptions?.input
    assert.exists(input, 'expected rolldownOptions.input to be set')
  })
})
