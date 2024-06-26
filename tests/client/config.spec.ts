/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { Plugin, build } from 'vite'
import adonisjs from '../../src/client/main.js'

test.group('Vite plugin', () => {
  test('build the assets', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("hello")')

    await build({
      root: fs.basePath,
      logLevel: 'warn',
      plugins: [adonisjs({ entrypoints: ['./resources/js/app.ts'] })],
    })

    await assert.fileContains('public/assets/.vite/manifest.json', 'resources/js/app.ts')
  })

  test('build the assets with custom manifest filename', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("hello")')

    await build({
      root: fs.basePath,
      logLevel: 'warn',
      plugins: [adonisjs({ entrypoints: ['./resources/js/app.ts'] })],
      build: { manifest: 'foo.json' },
    })

    await assert.fileContains('public/assets/foo.json', 'resources/js/app.ts')
  })

  test('define the asset url', async ({ assert }) => {
    const plugin = adonisjs({
      entrypoints: ['./resources/js/app.ts'],
      assetsUrl: 'https://cdn.com',
      buildDirectory: 'my-assets',
    })[1] as Plugin

    // @ts-ignore
    const config = plugin!.config!({}, { command: 'build' })
    assert.deepEqual(config.base, 'https://cdn.com/')
  })

  test('disable vite dev server cors handling', async ({ assert }) => {
    const plugin = adonisjs({
      entrypoints: ['./resources/js/app.ts'],
    })[1] as Plugin

    // @ts-ignore
    const config = plugin!.config!({}, { command: 'serve' })
    assert.deepEqual(config.server?.cors, false)
  })
})
