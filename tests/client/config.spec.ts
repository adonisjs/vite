/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { type Plugin, build } from 'vite'
import adonisjs from '../../src/client/main.ts'

test.group('Vite plugin', () => {
  test('build the assets', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("hello")')

    await build({
      root: fs.basePath,
      logLevel: 'warn',
      plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })],
    })

    await assert.fileContains('public/assets/.vite/manifest.json', 'resources/js/app.ts')
  })

  test('build the assets with custom manifest filename', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("hello")')

    await build({
      root: fs.basePath,
      logLevel: 'warn',
      plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })],
      build: { manifest: 'foo.json' },
    })

    await assert.fileContains('public/assets/foo.json', 'resources/js/app.ts')
  })

  test('define the asset url', async ({ assert }) => {
    const plugin = adonisjs({
      entryPoints: ['./resources/js/app.ts'],
      assetsUrl: 'https://cdn.com',
      buildDirectory: 'my-assets',
    })[1] as Plugin

    // @ts-ignore
    const config = plugin!.config!({}, { command: 'build' })
    assert.deepEqual(config.base, 'https://cdn.com/')
  })

  test('disable vite dev server cors handling', async ({ assert }) => {
    const plugin = adonisjs({
      entryPoints: ['./resources/js/app.ts'],
    })[1] as Plugin

    // @ts-ignore
    const config = plugin!.config!({}, { command: 'serve' })
    assert.deepEqual(config.server?.cors, false)
  })

  test('emit rolldownOptions.input from entry points', async ({ assert }) => {
    const plugin = adonisjs({
      entryPoints: ['./resources/js/app.ts', './resources/js/admin.ts'],
    })[1] as Plugin

    // @ts-ignore
    const config = plugin!.config!({ root: '/app' }, { command: 'build' })
    assert.deepEqual(config.build?.rolldownOptions?.input, [
      './resources/js/app.ts',
      './resources/js/admin.ts',
    ])
  })

  test('respect user-provided build.rolldownOptions.input', async ({ assert }) => {
    const plugin = adonisjs({
      entryPoints: ['./resources/js/app.ts'],
    })[1] as Plugin

    // @ts-ignore
    const config = plugin!.config!(
      { build: { rolldownOptions: { input: 'custom/entry.ts' } } },
      { command: 'build' }
    )
    assert.equal(config.build?.rolldownOptions?.input, 'custom/entry.ts')
  })

  test('respect legacy build.rollupOptions.input for backwards compat', async ({ assert }) => {
    const plugin = adonisjs({
      entryPoints: ['./resources/js/app.ts'],
    })[1] as Plugin

    // @ts-ignore
    const config = plugin!.config!(
      { build: { rollupOptions: { input: 'legacy/entry.ts' } } },
      { command: 'build' }
    )
    assert.equal(config.build?.rolldownOptions?.input, 'legacy/entry.ts')
  })

  test('apply build defaults: publicDir, assetsDir, emptyOutDir, manifest, assetsInlineLimit', async ({
    assert,
  }) => {
    const plugin = adonisjs({
      entryPoints: ['./resources/js/app.ts'],
    })[1] as Plugin

    // @ts-ignore
    const config = plugin!.config!({}, { command: 'build' })
    assert.equal(config.publicDir, false)
    assert.equal(config.build?.assetsDir, '')
    assert.equal(config.build?.emptyOutDir, true)
    assert.equal(config.build?.manifest, true)
    assert.equal(config.build?.assetsInlineLimit, 0)
  })

  test('user manifest filename overrides default', async ({ assert }) => {
    const plugin = adonisjs({
      entryPoints: ['./resources/js/app.ts'],
    })[1] as Plugin

    // @ts-ignore
    const config = plugin!.config!(
      { build: { manifest: 'custom-manifest.json' } },
      { command: 'build' }
    )
    assert.equal(config.build?.manifest, 'custom-manifest.json')
  })

  test('user outDir overrides buildDirectory', async ({ assert }) => {
    const plugin = adonisjs({
      entryPoints: ['./resources/js/app.ts'],
      buildDirectory: 'public/assets',
    })[1] as Plugin

    // @ts-ignore
    const config = plugin!.config!({ build: { outDir: 'dist' } }, { command: 'build' })
    assert.equal(config.build?.outDir, 'dist')
  })

  test('preserve user cors config when defined', async ({ assert }) => {
    const plugin = adonisjs({
      entryPoints: ['./resources/js/app.ts'],
    })[1] as Plugin

    // @ts-ignore
    const config = plugin!.config!({ server: { cors: true } }, { command: 'serve' })
    assert.equal(config.server?.cors, true)
  })
})
