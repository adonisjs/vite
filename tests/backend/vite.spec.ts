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

import { Vite } from '../../src/vite.js'
import { defineConfig } from '../../src/define_config.js'

test.group('Vite | hotMode', () => {
  test('generate entrypoints tags for a file', async ({ assert, fs }) => {
    const vite = new Vite(
      true,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
      })
    )

    const output = vite.generateEntryPointsTags('test.js')

    assert.containsSubset(output, [
      {
        tag: 'script',
        attributes: { type: 'module', src: '/@vite/client' },
        children: [],
      },
      {
        tag: 'script',
        attributes: { type: 'module', src: '/test.js' },
        children: [],
      },
    ])
    assert.deepEqual(
      output.map((element) => String(element)),
      [
        '<script type="module" src="/@vite/client"></script>',
        '<script type="module" src="/test.js"></script>',
      ]
    )
  })

  test('ignore assetsUrl in dev mode', async ({ assert, fs }) => {
    const vite = new Vite(
      true,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
      })
    )

    const output = vite.generateEntryPointsTags('test.js')

    assert.containsSubset(output, [
      {
        tag: 'script',
        attributes: { type: 'module', src: '/@vite/client' },
        children: [],
      },
      {
        tag: 'script',
        attributes: { type: 'module', src: '/test.js' },
        children: [],
      },
    ])
    assert.deepEqual(
      output.map((element) => String(element)),
      [
        '<script type="module" src="/@vite/client"></script>',
        '<script type="module" src="/test.js"></script>',
      ]
    )
  })

  test('raise exception when trying to access manifest file in hot mode', async ({ fs }) => {
    const vite = new Vite(
      true,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
      })
    )

    vite.manifest()
  }).throws('Cannot read the manifest file when running in dev mode')

  test('get asset path', async ({ fs, assert }) => {
    const vite = new Vite(
      true,
      defineConfig({ buildDirectory: join(fs.basePath, 'public/assets') })
    )

    assert.equal(vite.assetPath('test.js'), '/test.js')
  })

  test('ignore custom assetsUrl in hot mode', async ({ fs, assert }) => {
    const vite = new Vite(
      true,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
      })
    )

    assert.equal(vite.assetPath('test.js'), '/test.js')
  })

  test('get viteHMRScript for React', async ({ fs, assert }) => {
    const vite = new Vite(
      true,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
      })
    )

    assert.containsSubset(vite.getReactHmrScript(), {
      tag: 'script',
      attributes: {
        type: 'module',
      },
      children: [
        '',
        `import RefreshRuntime from '/@react-refresh'`,
        `RefreshRuntime.injectIntoGlobalHook(window)`,
        `window.$RefreshReg$ = () => {}`,
        `window.$RefreshSig$ = () => (type) => type`,
        `window.__vite_plugin_react_preamble_installed__ = true`,
        '',
      ],
    })
  })

  test('add custom attributes to the entrypoints script tags', async ({ assert, fs }) => {
    const vite = new Vite(
      true,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
        scriptAttributes: {
          'data-test': 'test',
        },
      })
    )

    const output = vite.generateEntryPointsTags('test.js')

    assert.containsSubset(output, [
      {
        tag: 'script',
        attributes: { type: 'module', src: '/@vite/client' },
        children: [],
      },
      {
        tag: 'script',
        attributes: {
          'type': 'module',
          'data-test': 'test',
          'src': '/test.js',
        },
        children: [],
      },
    ])
    assert.deepEqual(
      output.map((element) => String(element)),
      [
        '<script type="module" src="/@vite/client"></script>',
        '<script type="module" data-test="test" src="/test.js"></script>',
      ]
    )
  })

  test('add custom attributes to the entrypoints style tags', async ({ assert, fs }) => {
    const vite = new Vite(
      true,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
        styleAttributes: {
          'data-test': 'test',
        },
      })
    )

    const output = vite.generateEntryPointsTags('app.css')

    assert.containsSubset(output, [
      {
        tag: 'script',
        attributes: { type: 'module', src: '/@vite/client' },
        children: [],
      },
      {
        tag: 'link',
        attributes: {
          'rel': 'stylesheet',
          'data-test': 'test',
          'href': '/app.css',
        },
      },
    ])
    assert.deepEqual(
      output.map((element) => String(element)),
      [
        '<script type="module" src="/@vite/client"></script>',
        '<link rel="stylesheet" data-test="test" href="/app.css"/>',
      ]
    )
  })

  // test('return path to assets directory', async ({ assert, fs }) => {
  //   const vite = new Vite(
  //     true,
  //     defineConfig({
  //       buildDirectory: join(fs.basePath, 'public/assets'),
  //     })
  //   )

  //   assert.equal(vite.assetsUrl(), 'http://localhost:9484')
  // })
})

test.group('Vite | manifest', () => {
  test('generate entrypoints tags for a file', async ({ assert, fs }) => {
    const vite = new Vite(
      false,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
      })
    )

    await fs.create(
      'public/assets/.vite/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    const output = vite.generateEntryPointsTags('test.js')

    assert.containsSubset(output, [
      {
        tag: 'script',
        attributes: { type: 'module', src: '/assets/test-12345.js' },
        children: [],
      },
    ])
    assert.deepEqual(
      output.map((element) => String(element)),
      ['<script type="module" src="/assets/test-12345.js"></script>']
    )
  })

  test('generate entrypoints with css imported inside js', async ({ assert, fs }) => {
    const vite = new Vite(
      false,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
      })
    )

    await fs.create(
      'public/assets/.vite/manifest.json',
      JSON.stringify({
        'test.js': { file: 'test-12345.js', src: 'test.js', css: ['main.b82dbe22.css'] },
        'main.css': { file: 'main.b82dbe22.css', src: 'main.css' },
      })
    )

    const output = vite.generateEntryPointsTags('test.js')

    assert.containsSubset(output, [
      {
        tag: 'link',
        attributes: { rel: 'stylesheet', href: '/assets/main.b82dbe22.css' },
      },
      {
        tag: 'script',
        attributes: { type: 'module', src: '/assets/test-12345.js' },
        children: [],
      },
    ])
    assert.deepEqual(
      output.map((element) => String(element)),
      [
        '<link rel="stylesheet" href="/assets/main.b82dbe22.css"/>',
        '<script type="module" src="/assets/test-12345.js"></script>',
      ]
    )
  })

  test('prefix assetsUrl', async ({ assert, fs }) => {
    const vite = new Vite(
      false,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
      })
    )

    await fs.create(
      'public/assets/.vite/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    const output = vite.generateEntryPointsTags('test.js')

    assert.containsSubset(output, [
      {
        tag: 'script',
        attributes: { type: 'module', src: 'https://cdn.url.com/test-12345.js' },
        children: [],
      },
    ])
    assert.deepEqual(
      output.map((element) => String(element)),
      ['<script type="module" src="https://cdn.url.com/test-12345.js"></script>']
    )
  })

  test('access manifest file', async ({ fs, assert }) => {
    const vite = new Vite(
      false,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
      })
    )

    await fs.create(
      'public/assets/.vite/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    assert.deepEqual(vite.manifest(), { 'test.js': { file: 'test-12345.js', src: 'test.js' } })
  })

  test('get asset path', async ({ fs, assert }) => {
    const vite = new Vite(
      false,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
      })
    )

    await fs.create(
      'public/assets/.vite/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    assert.equal(vite.assetPath('test.js'), '/assets/test-12345.js')
  })

  test('throw error when manifest does not have the chunk', async ({ fs }) => {
    const vite = new Vite(
      false,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
      })
    )

    await fs.create(
      'public/assets/.vite/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    vite.assetPath('app.css')
  }).throws('Cannot find "app.css" chunk in the manifest file')

  test('prefix custom assetsUrl to the assetPath', async ({ fs, assert }) => {
    const vite = new Vite(
      false,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
      })
    )

    await fs.create(
      'public/assets/.vite/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    assert.equal(vite.assetPath('test.js'), 'https://cdn.url.com/test-12345.js')
  })

  test('return null for viteHMRScript when not in hot mode', async ({ fs, assert }) => {
    const vite = new Vite(
      false,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
      })
    )

    await fs.create(
      'public/assets/.vite/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    assert.isNull(vite.getReactHmrScript())
  })

  test('add custom attributes to the entrypoints script tags', async ({ assert, fs }) => {
    const vite = new Vite(
      false,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
        scriptAttributes: () => {
          return {
            'data-test': 'test',
          }
        },
      })
    )

    await fs.create(
      'public/assets/.vite/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    const output = vite.generateEntryPointsTags('test.js')

    assert.containsSubset(output, [
      {
        tag: 'script',
        attributes: {
          'type': 'module',
          'data-test': 'test',
          'src': 'https://cdn.url.com/test-12345.js',
        },
        children: [],
      },
    ])
    assert.deepEqual(
      output.map((element) => String(element)),
      ['<script type="module" data-test="test" src="https://cdn.url.com/test-12345.js"></script>']
    )
  })

  test('add custom attributes to the entrypoints link tags', async ({ assert, fs }) => {
    const vite = new Vite(
      false,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
        styleAttributes: {
          'data-test': 'test',
        },
      })
    )

    await fs.create(
      'public/assets/.vite/manifest.json',
      JSON.stringify({ 'app.css': { file: 'app-12345.css', src: 'app.css' } })
    )

    const output = vite.generateEntryPointsTags('app.css')

    assert.containsSubset(output, [
      {
        tag: 'link',
        attributes: {
          'rel': 'stylesheet',
          'data-test': 'test',
          'href': 'https://cdn.url.com/app-12345.css',
        },
      },
    ])
    assert.deepEqual(
      output.map((element) => String(element)),
      ['<link rel="stylesheet" data-test="test" href="https://cdn.url.com/app-12345.css"/>']
    )
  })

  test('add integrity attribute to entrypoint tags', async ({ assert, fs }) => {
    const vite = new Vite(
      false,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
      })
    )

    await fs.create(
      'public/assets/.vite/manifest.json',
      JSON.stringify({
        'test.js': {
          file: 'test-12345.js',
          src: 'test.js',
          integrity: 'sha384-hNF0CSk1Cqwkjmpb374DXqtYJ/rDp5SqV6ttpKEnqyjT/gDHGHuYsj3XzBcMke15',
          css: ['app-12345.css'],
        },
      })
    )

    const output = vite.generateEntryPointsTags('test.js')

    assert.containsSubset(output, [
      {
        tag: 'link',
        attributes: {
          rel: 'stylesheet',
          href: 'https://cdn.url.com/app-12345.css',
        },
      },
      {
        tag: 'script',
        attributes: {
          type: 'module',
          integrity: 'sha384-hNF0CSk1Cqwkjmpb374DXqtYJ/rDp5SqV6ttpKEnqyjT/gDHGHuYsj3XzBcMke15',
          src: 'https://cdn.url.com/test-12345.js',
        },
        children: [],
      },
    ])
    assert.deepEqual(
      output.map((element) => String(element)),
      [
        '<link rel="stylesheet" href="https://cdn.url.com/app-12345.css"/>',
        '<script type="module" integrity="sha384-hNF0CSk1Cqwkjmpb374DXqtYJ/rDp5SqV6ttpKEnqyjT/gDHGHuYsj3XzBcMke15" src="https://cdn.url.com/test-12345.js"></script>',
      ]
    )
  })

  test('return path to assets directory', async ({ assert, fs }) => {
    const vite = new Vite(
      false,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
      })
    )

    assert.equal(vite.assetsUrl(), '/assets')
  })
})
