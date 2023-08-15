/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Edge } from 'edge.js'
import { join } from 'node:path'
import { test } from '@japa/runner'

import { Vite } from '../../src/backend/vite.js'
import { edgePluginVite } from '../../src/backend/edge_plugin_vite.js'

test.group('Edge plugin vite', () => {
  test('generate asset path within edge template', async ({ assert, fs }) => {
    const edge = Edge.create()
    const vite = new Vite({
      buildDirectory: join(fs.basePath, 'public/assets'),
      hotFile: join(fs.basePath, 'public/assets/hot.json'),
    })
    edge.use(edgePluginVite(vite))

    await fs.create('public/assets/hot.json', '{ "url": "http://localhost:9484" }')
    const html = await edge.renderRaw(`{{ asset('foo.png') }}`)
    assert.equal(html, 'http://localhost:9484/foo.png')
  })

  test('share vite instance with edge', async ({ assert, fs }) => {
    const edge = Edge.create()
    const vite = new Vite({
      buildDirectory: join(fs.basePath, 'public/assets'),
      hotFile: join(fs.basePath, 'public/assets/hot.json'),
    })
    edge.use(edgePluginVite(vite))

    await fs.create('public/assets/hot.json', '{ "url": "http://localhost:9484" }')
    const html = await edge.renderRaw(`{{ vite.assetPath('foo.png') }}`)
    assert.equal(html, 'http://localhost:9484/foo.png')
  })

  test('output reactHMRScript', async ({ assert, fs }) => {
    const edge = Edge.create()
    const vite = new Vite({
      buildDirectory: join(fs.basePath, 'public/assets'),
      hotFile: join(fs.basePath, 'public/assets/hot.json'),
    })
    edge.use(edgePluginVite(vite))

    await fs.create('public/assets/hot.json', '{ "url": "http://localhost:9484" }')
    const html = await edge.renderRaw(`@viteReactRefresh()`)
    assert.deepEqual(html.split('\n'), [
      `<script type="module">`,
      `import RefreshRuntime from 'http://localhost:9484/@react-refresh'`,
      `RefreshRuntime.injectIntoGlobalHook(window)`,
      `window.$RefreshReg$ = () => {}`,
      `window.$RefreshSig$ = () => (type) => type`,
      `window.__vite_plugin_react_preamble_installed__ = true`,
      `</script>`,
    ])
  })

  test('do not output hmrScript when not in hot mode', async ({ assert, fs }) => {
    const edge = Edge.create()
    const vite = new Vite({
      buildDirectory: join(fs.basePath, 'public/assets'),
      hotFile: join(fs.basePath, 'public/assets/hot.json'),
    })
    edge.use(edgePluginVite(vite))

    const html = await edge.renderRaw(`@viteReactRefresh()`)
    assert.deepEqual(html.split('\n'), [''])
  })

  test('output entrypoint tags', async ({ assert, fs }) => {
    const edge = Edge.create()
    const vite = new Vite({
      buildDirectory: join(fs.basePath, 'public/assets'),
      hotFile: join(fs.basePath, 'public/assets/hot.json'),
    })
    edge.use(edgePluginVite(vite))

    await fs.create('public/assets/hot.json', '{ "url": "http://localhost:9484" }')
    const html = await edge.renderRaw(`@vite(['resources/js/app.js'])`)
    assert.deepEqual(html.split('\n'), [
      '<script type="module" src="http://localhost:9484/@vite/client"></script>',
      '<script type="module" src="http://localhost:9484/resources/js/app.js"></script>',
    ])
  })
})
