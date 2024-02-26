/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Edge } from 'edge.js'
import { test } from '@japa/runner'

import { Vite } from '../../src/vite.js'
import { defineConfig } from '../../src/define_config.js'
import { edgePluginVite } from '../../src/plugins/edge.js'

test.group('Edge plugin vite', () => {
  test('generate asset path within edge template', async ({ assert }) => {
    const edge = Edge.create()
    const vite = new Vite(true, defineConfig({}))
    edge.use(edgePluginVite(vite))

    const html = await edge.renderRaw(`{{ asset('foo.png') }}`)
    assert.equal(html, '/foo.png')
  })

  test('share vite instance with edge', async ({ assert }) => {
    const edge = Edge.create()
    const vite = new Vite(true, defineConfig({}))
    edge.use(edgePluginVite(vite))

    const html = await edge.renderRaw(`{{ vite.assetPath('foo.png') }}`)
    assert.equal(html, '/foo.png')
  })

  test('output reactHMRScript', async ({ assert }) => {
    const edge = Edge.create()
    const vite = new Vite(true, defineConfig({}))
    edge.use(edgePluginVite(vite))

    const html = await edge.renderRaw(`@viteReactRefresh()`)
    assert.deepEqual(html.split('\n'), [
      `<script type="module">`,
      `import RefreshRuntime from '/@react-refresh'`,
      `RefreshRuntime.injectIntoGlobalHook(window)`,
      `window.$RefreshReg$ = () => {}`,
      `window.$RefreshSig$ = () => (type) => type`,
      `window.__vite_plugin_react_preamble_installed__ = true`,
      `</script>`,
    ])
  })

  test('pass custom attributes to reactHMRScript', async ({ assert }) => {
    const edge = Edge.create()
    const vite = new Vite(true, defineConfig({}))
    edge.use(edgePluginVite(vite))

    const html = await edge.renderRaw(`@viteReactRefresh({ nonce: 'foo' })`)
    assert.deepEqual(html.split('\n'), [
      `<script type="module" nonce="foo">`,
      `import RefreshRuntime from '/@react-refresh'`,
      `RefreshRuntime.injectIntoGlobalHook(window)`,
      `window.$RefreshReg$ = () => {}`,
      `window.$RefreshSig$ = () => (type) => type`,
      `window.__vite_plugin_react_preamble_installed__ = true`,
      `</script>`,
    ])
  })

  test('do not output hmrScript when not in hot mode', async ({ assert }) => {
    const edge = Edge.create()
    const vite = new Vite(false, defineConfig({}))
    edge.use(edgePluginVite(vite))

    const html = await edge.renderRaw(`@viteReactRefresh()`)
    assert.deepEqual(html.split('\n'), [''])
  })

  test('output entrypoint tags', async ({ assert }) => {
    const edge = Edge.create()
    const vite = new Vite(true, defineConfig({}))
    edge.use(edgePluginVite(vite))

    const html = await edge.renderRaw(`@vite(['resources/js/app.js'])`)
    assert.deepEqual(html.split('\n'), [
      '<script type="module" src="/@vite/client"></script>',
      '<script type="module" src="/resources/js/app.js"></script>',
    ])
  })

  test('output entrypoint tags with custom attributes', async ({ assert }) => {
    const edge = Edge.create()
    const vite = new Vite(true, defineConfig({}))
    edge.use(edgePluginVite(vite))

    const html = await edge.renderRaw(`@vite(['resources/js/app.js'], { nonce: 'foo' })`)
    assert.deepEqual(html.split('\n'), [
      '<script type="module" src="/@vite/client" nonce="foo"></script>',
      '<script type="module" nonce="foo" src="/resources/js/app.js"></script>',
    ])
  })
})
