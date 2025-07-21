/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { setTimeout } from 'node:timers/promises'
import { IgnitorFactory } from '@adonisjs/core/factories'

import { defineConfig } from '../../index.js'
import ViteMiddleware from '../../src/vite_middleware.js'
import { join } from 'node:path'

const BASE_URL = new URL('./tmp/', import.meta.url)
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, BASE_URL).href)
  }
  return import(filePath)
}

test.group('Vite Provider', () => {
  test('register vite middleware singleton', async ({ assert }) => {
    const ignitor = new IgnitorFactory()
      .merge({ rcFileContents: { providers: [() => import('../../providers/vite_provider.js')] } })
      .withCoreConfig()
      .withCoreProviders()
      .merge({ config: { vite: defineConfig({}) } })
      .create(BASE_URL, { importer: IMPORTER })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    assert.instanceOf(await app.container.make(ViteMiddleware), ViteMiddleware)

    await app.terminate()
  })

  test('launch dev server in dev mode', async ({ assert }) => {
    const ignitor = new IgnitorFactory()
      .merge({ rcFileContents: { providers: [() => import('../../providers/vite_provider.js')] } })
      .withCoreConfig()
      .withCoreProviders()
      .merge({ config: { vite: defineConfig({}) } })
      .create(BASE_URL, { importer: IMPORTER })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    const vite = await app.container.make('vite')

    await setTimeout(200)
    assert.isDefined(vite.getDevServer()?.restart)

    await app.terminate()
  })

  test('doesnt launch dev server if manifest exist', async ({ assert, fs }) => {
    const ignitor = new IgnitorFactory()
      .merge({ rcFileContents: { providers: [() => import('../../providers/vite_provider.js')] } })
      .withCoreConfig()
      .withCoreProviders()
      .merge({
        config: {
          vite: defineConfig({
            manifestFile: join(fs.basePath, 'public/assets/.vite/manifest.json'),
          }),
        },
      })
      .create(BASE_URL, { importer: IMPORTER })

    await fs.create('public/assets/.vite/manifest.json', '{}')
    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    const vite = await app.container.make('vite')
    assert.isUndefined(vite.getDevServer())

    await app.terminate()
  })

  test('run dev server in test', async ({ assert }) => {
    const ignitor = new IgnitorFactory()
      .merge({ rcFileContents: { providers: [() => import('../../providers/vite_provider.js')] } })
      .withCoreConfig()
      .withCoreProviders()
      .merge({ config: { vite: defineConfig({}) } })
      .create(BASE_URL, { importer: IMPORTER })

    const app = ignitor.createApp('test')
    await app.init()
    await app.boot()

    const vite = await app.container.make('vite')
    await setTimeout(200)
    assert.isDefined(vite.getDevServer()?.restart)

    await app.terminate()
  })

  test('doesnt launch dev server in console environment', async ({ assert }) => {
    const ignitor = new IgnitorFactory()
      .merge({ rcFileContents: { providers: [() => import('../../providers/vite_provider.js')] } })
      .withCoreConfig()
      .withCoreProviders()
      .merge({ config: { vite: defineConfig({}) } })
      .create(BASE_URL, { importer: IMPORTER })

    const app = ignitor.createApp('console')
    await app.init()
    await app.boot()

    const vite = await app.container.make('vite')
    assert.isUndefined(vite.getDevServer())

    await app.terminate()
  })

  test('register edge plugin', async ({ assert }) => {
    const ignitor = new IgnitorFactory()
      .merge({
        rcFileContents: {
          providers: [
            () => import('../../providers/vite_provider.js'),
            () => import('@adonisjs/core/providers/edge_provider'),
          ],
        },
      })
      .withCoreConfig()
      .withCoreProviders()
      .merge({ config: { vite: defineConfig({}) } })
      .create(BASE_URL, { importer: IMPORTER })

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    const edge = await import('edge.js')
    await edge.default.renderRaw('')

    assert.isDefined(edge.default.tags.vite)

    await app.terminate()
  })
})
