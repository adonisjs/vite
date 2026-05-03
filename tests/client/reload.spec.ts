/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { test } from '@japa/runner'
import { build } from 'vite'

import { reload } from '../../src/client/reload.ts'
import { bootDevServer, waitForReload } from '../backend/helpers.ts'

test.group('reload plugin | shape', () => {
  test('returns a Vite plugin with name and apply: serve', ({ assert }) => {
    const plugin = reload(['./resources/views/**/*.edge'])
    assert.equal(plugin.name, 'adonisjs:reload')
    assert.equal(plugin.apply, 'serve')
    assert.isFunction(plugin.configureServer)
  })

  test('accepts a single string pattern', ({ assert }) => {
    const plugin = reload('./resources/views/**/*.edge')
    assert.equal(plugin.name, 'adonisjs:reload')
  })

  test('is a no-op during build (apply: serve only)', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("ok")')
    await fs.create('resources/views/home.edge', '<h1>Home</h1>')

    /**
     * Build invocation must succeed even though our plugin is in the chain.
     * apply: 'serve' guarantees configureServer is never called.
     */
    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [reload(['./resources/views/**/*.edge'])],
      build: {
        rolldownOptions: { input: join(fs.basePath, 'resources/js/app.ts') },
        outDir: 'dist',
        manifest: true,
      },
    })

    assert.isTrue(true)
  })
})

test.group('reload plugin | runtime', () => {
  test('triggers full-reload when matching file changes', async ({ fs, assert }) => {
    await fs.create('resources/views/home.edge', '<h1>Home</h1>')

    const { sent } = await bootDevServer(fs.basePath, [
      reload(['./resources/views/**/*.edge'], { delay: 30 }),
    ])

    await fs.create('resources/views/home.edge', '<h1>Updated</h1>')
    await waitForReload(sent)

    const reloadMsg = sent.find((m) => m.type === 'full-reload')
    assert.deepEqual(reloadMsg, { type: 'full-reload', path: '*' })
  })

  test('does not trigger reload for non-matching files', async ({ fs, assert }) => {
    await fs.create('resources/views/home.edge', '<h1>Home</h1>')
    await fs.create('app/Controllers/home.ts', 'export const x = 1')

    const { sent } = await bootDevServer(fs.basePath, [
      reload(['./resources/views/**/*.edge'], { delay: 30 }),
    ])

    await fs.create('app/Controllers/home.ts', 'export const x = 2')

    await new Promise((r) => setTimeout(r, 250))
    assert.notExists(sent.find((m) => m && m.type === 'full-reload'))
  })

  test('debounces rapid bursts into a single reload message', async ({ fs, assert }) => {
    await fs.create('resources/views/home.edge', '<h1>Home</h1>')

    const { sent } = await bootDevServer(fs.basePath, [
      reload(['./resources/views/**/*.edge'], { delay: 80 }),
    ])

    await fs.create('resources/views/home.edge', '<h1>v1</h1>')
    await fs.create('resources/views/home.edge', '<h1>v2</h1>')
    await fs.create('resources/views/home.edge', '<h1>v3</h1>')

    await waitForReload(sent)
    /** Allow trailing edge of debounce window to expire. */
    await new Promise((r) => setTimeout(r, 150))

    const reloads = sent.filter((m) => m && m.type === 'full-reload')
    assert.lengthOf(reloads, 1)
  })

  test('matches files added after server boot', async ({ fs, assert }) => {
    await fs.create('resources/views/.keep', '')

    const { sent } = await bootDevServer(fs.basePath, [
      reload(['./resources/views/**/*.edge'], { delay: 30 }),
    ])

    await fs.create('resources/views/new_page.edge', '<h1>New</h1>')
    await waitForReload(sent)

    assert.exists(sent.find((m) => m && m.type === 'full-reload'))
  })

  test('matches files across multiple patterns', async ({ fs, assert }) => {
    await fs.create('resources/views/a.edge', 'a')
    await fs.create('resources/lang/en.json', '{}')

    const { sent } = await bootDevServer(fs.basePath, [
      reload(['./resources/views/**/*.edge', './resources/lang/**/*.json'], { delay: 30 }),
    ])

    await fs.create('resources/lang/en.json', '{"k":"v"}')
    await waitForReload(sent)

    assert.exists(sent.find((m) => m && m.type === 'full-reload'))
  })
})
