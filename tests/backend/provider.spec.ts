/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { IgnitorFactory } from '@adonisjs/core/factories'
import { test } from '@japa/runner'
import { defineConfig } from '../../index.js'
import ViteMiddleware from '../../src/middlewares/vite_middleware.js'

const BASE_URL = new URL('./tmp/', import.meta.url)
const IMPORTER = (filePath: string) => {
  if (filePath.startsWith('./') || filePath.startsWith('../')) {
    return import(new URL(filePath, BASE_URL).href)
  }
  return import(filePath)
}

test.group('Inertia Provider', () => {
  test('register vite middleware singleton', async ({ assert }) => {
    process.env.NODE_ENV = 'development'

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
    process.env.NODE_ENV = 'development'

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
    assert.isDefined(vite.getDevServer()?.restart)

    await app.terminate()
  })

  test('doesnt launch dev server in prod', async ({ assert }) => {
    process.env.NODE_ENV = 'production'

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
    assert.isUndefined(vite.getDevServer())

    await app.terminate()
  })

  test('run dev server in test', async ({ assert }) => {
    process.env.NODE_ENV = 'test'

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
    process.env.NODE_ENV = 'development'

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

  test('register edge plugin in production', async ({ assert }) => {
    process.env.NODE_ENV = 'production'

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
