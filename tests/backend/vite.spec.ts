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
import { fileURLToPath } from 'node:url'

import { Vite } from '../../src/vite.js'
import { createVite } from './helpers.js'
import { defineConfig } from '../../src/define_config.js'

test.group('Vite | dev', () => {
  test('generate entrypoints tags for a file', async ({ assert, fs }) => {
    const vite = await createVite(
      defineConfig({ buildDirectory: join(fs.basePath, 'public/assets') })
    )

    const output = await vite.generateEntryPointsTags('test.js')

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
    const vite = await createVite(
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
      })
    )

    const output = await vite.generateEntryPointsTags('test.js')

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

  test('raise exception when trying to access manifest file in dev mode', async ({ fs }) => {
    const vite = await createVite(
      defineConfig({ buildDirectory: join(fs.basePath, 'public/assets') })
    )

    vite.manifest()
  }).throws('Cannot read the manifest file when running in dev mode')

  test('get asset path', async ({ fs, assert }) => {
    const vite = await createVite(
      defineConfig({ buildDirectory: join(fs.basePath, 'public/assets') })
    )

    assert.equal(vite.assetPath('test.js'), '/test.js')
  })

  test('ignore custom assetsUrl in dev mode', async ({ fs, assert }) => {
    const vite = await createVite(
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
      })
    )

    assert.equal(vite.assetPath('test.js'), '/test.js')
  })

  test('get viteHMRScript for React', async ({ fs, assert }) => {
    const vite = await createVite(
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
    const vite = await createVite(
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
        scriptAttributes: {
          'data-test': 'test',
        },
      })
    )

    const output = await vite.generateEntryPointsTags('test.js')

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
    const vite = await createVite(
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
        assetsUrl: 'https://cdn.url.com',
        styleAttributes: {
          'data-test': 'test',
        },
      })
    )

    const output = await vite.generateEntryPointsTags('app.css')

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
        '<link rel="stylesheet" data-test="test" href="/app.css"/>',
        '<script type="module" src="/@vite/client"></script>',
      ]
    )
  })
})

test.group('Vite | manifest', () => {
  test('generate entrypoints tags for a file', async ({ assert, fs, cleanup }) => {
    const vite = new Vite(
      false,
      defineConfig({
        buildDirectory: join(fs.basePath, 'public/assets'),
      })
    )

    await vite.createDevServer()
    cleanup(() => vite.stopDevServer())

    await fs.create(
      'public/assets/.vite/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    const output = await vite.generateEntryPointsTags('test.js')

    assert.containsSubset(output, [
      {
        tag: 'script',
        attributes: { type: 'module', src: '/assets/test-12345.js' },
        children: [],
      },
    ])
    assert.containsSubset(
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

    const output = await vite.generateEntryPointsTags('test.js')

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
    assert.containsSubset(
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

    const output = await vite.generateEntryPointsTags('test.js')

    assert.containsSubset(output, [
      {
        tag: 'script',
        attributes: { type: 'module', src: 'https://cdn.url.com/test-12345.js' },
        children: [],
      },
    ])
    assert.containsSubset(
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

    const output = await vite.generateEntryPointsTags('test.js')

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
    assert.containsSubset(
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

    const output = await vite.generateEntryPointsTags('app.css')

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
    assert.containsSubset(
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

    const output = await vite.generateEntryPointsTags('test.js')

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
    assert.containsSubset(
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

test.group('Preloading', () => {
  const config = defineConfig({
    manifestFile: fileURLToPath(new URL('fixtures/adonis_packages_manifest.json', import.meta.url)),
  })

  test('Preload root entrypoints', async ({ assert }) => {
    const vite = new Vite(false, config)
    const entrypoints = await vite.generateEntryPointsTags('resources/pages/home/main.vue')

    const result = entrypoints.map((tag) => tag.toString())

    assert.include(result, '<link rel="modulepreload" href="/assets/main-CKiOIoD7.js"/>')
  })

  test('Preload files imported from entrypoints', async ({ assert }) => {
    const vite = new Vite(false, config)
    const entrypoints = await vite.generateEntryPointsTags('resources/pages/home/main.vue')

    const result = entrypoints.map((tag) => tag.toString())

    assert.includeMembers(result, [
      '<link rel="modulepreload" href="/assets/app-CGO3UiiC.js"/>',
      '<link rel="modulepreload" href="/assets/index-C1JNlH7D.js"/>',
      '<link rel="modulepreload" href="/assets/main_section-CT1dtBDn.js"/>',
      '<link rel="modulepreload" href="/assets/_plugin-vue_export-helper-DlAUqK2U.js"/>',
      '<link rel="modulepreload" href="/assets/default-Do-xftcX.js"/>',
      '<link rel="modulepreload" href="/assets/order-D6tpsh_Z.js"/>',
      '<link rel="modulepreload" href="/assets/filters-Dmvaqb5E.js"/>',
    ])
  })

  test('Preload entrypoints css files', async ({ assert }) => {
    const vite = new Vite(false, config)
    const entrypoints = await vite.generateEntryPointsTags('resources/pages/home/main.vue')

    const result = entrypoints.map((tag) => tag.toString())

    assert.includeMembers(result, [
      '<link rel="preload" as="style" href="/assets/main-BcGYH63d.css"/>',
    ])
  })

  test('Preload css files of imported files of entrypoint', async ({ assert }) => {
    const vite = new Vite(false, config)
    const entrypoints = await vite.generateEntryPointsTags('resources/pages/home/main.vue')

    const result = entrypoints.map((tag) => tag.toString())

    assert.includeMembers(result, [
      '<link rel="preload" as="style" href="/assets/main-BcGYH63d.css"/>',
      '<link rel="preload" as="style" href="/assets/package_card-JrVjtBKi.css"/>',
      '<link rel="preload" as="style" href="/assets/default-CzWQScon.css"/>',
      '<link rel="preload" as="style" href="/assets/main_section-QGbeXyUe.css"/>',
      '<link rel="preload" as="style" href="/assets/app-2kD3K4XR.css"/>',
    ])
  })

  test('css preload should be ordered before js preload', async ({ assert }) => {
    const vite = new Vite(false, config)
    const entrypoints = await vite.generateEntryPointsTags('resources/pages/home/main.vue')

    const result = entrypoints.map((tag) => tag.toString())

    const cssPreloadIndex = result.findIndex((tag) => tag.includes('rel="preload" as="style"'))
    const jsPreloadIndex = result.findIndex((tag) => tag.includes('rel="modulepreload"'))

    assert.isTrue(cssPreloadIndex < jsPreloadIndex)
  })

  test('preloads should use assetsUrl when defined', async ({ assert }) => {
    const vite = new Vite(false, defineConfig({ ...config, assetsUrl: 'https://cdn.url.com' }))
    const entrypoints = await vite.generateEntryPointsTags('resources/pages/home/main.vue')

    const result = entrypoints.map((tag) => tag.toString())

    assert.includeMembers(result, [
      '<link rel="modulepreload" href="https://cdn.url.com/main-CKiOIoD7.js"/>',
      '<link rel="modulepreload" href="https://cdn.url.com/app-CGO3UiiC.js"/>',
      '<link rel="modulepreload" href="https://cdn.url.com/index-C1JNlH7D.js"/>',
      '<link rel="modulepreload" href="https://cdn.url.com/main_section-CT1dtBDn.js"/>',
      '<link rel="modulepreload" href="https://cdn.url.com/_plugin-vue_export-helper-DlAUqK2U.js"/>',
      '<link rel="modulepreload" href="https://cdn.url.com/default-Do-xftcX.js"/>',
      '<link rel="modulepreload" href="https://cdn.url.com/order-D6tpsh_Z.js"/>',
      '<link rel="modulepreload" href="https://cdn.url.com/filters-Dmvaqb5E.js"/>',
    ])
  })
})

test.group('Vite | collect css', () => {
  test('collect and preload css files of entrypoint', async ({ assert, fs }) => {
    const vite = await createVite(defineConfig({}), {
      build: { rollupOptions: { input: 'foo.ts' } },
    })

    await fs.create('foo.ts', `import './style.css'`)
    await fs.create('style.css', 'body { color: red }')

    const result = await vite.generateEntryPointsTags('foo.ts')

    assert.deepEqual(
      result.map((tag) => tag.toString()),
      [
        '<link rel="stylesheet" as="style" href="/style.css"/>',
        '<script type="module" src="/@vite/client"></script>',
        '<script type="module" src="/foo.ts"></script>',
      ]
    )
  })

  test('collect recursively css files of entrypoint', async ({ assert, fs }) => {
    const vite = await createVite(defineConfig({}), {
      build: { rollupOptions: { input: 'foo.ts' } },
    })

    await fs.create(
      'foo.ts',
      `
      import './foo2.ts'
      import './style.css'
      `
    )

    await fs.create('foo2.ts', `import './style2.css'`)
    await fs.create('style.css', 'body { color: red }')
    await fs.create('style2.css', 'body { color: blue }')

    const result = await vite.generateEntryPointsTags('foo.ts')

    assert.deepEqual(
      result.map((tag) => tag.toString()),
      [
        '<link rel="stylesheet" as="style" href="/style.css"/>',
        '<link rel="stylesheet" as="style" href="/style2.css"/>',
        '<script type="module" src="/@vite/client"></script>',
        '<script type="module" src="/foo.ts"></script>',
      ]
    )
  })

  test('collect css rendered page', async ({ assert, fs }) => {
    const vite = await createVite(defineConfig({}), {
      build: { rollupOptions: { input: 'foo.ts' } },
    })

    await fs.create(
      'app.ts',
      `
      import './style.css'
      import.meta.glob('./pages/**/*.tsx')
      `
    )
    await fs.create('style.css', 'body { color: red }')

    await fs.create('./pages/home/main.tsx', `import './style2.css'`)
    await fs.create('./pages/home/style2.css', 'body { color: blue }')

    const result = await vite.generateEntryPointsTags(['app.ts', 'pages/home/main.tsx'])

    assert.deepEqual(
      result.map((tag) => tag.toString()),
      [
        '<link rel="stylesheet" as="style" href="/pages/home/style2.css"/>',
        '<link rel="stylesheet" as="style" href="/style.css"/>',
        '<script type="module" src="/@vite/client"></script>',
        '<script type="module" src="/app.ts"></script>',
        '<script type="module" src="/pages/home/main.tsx"></script>',
      ]
    )
  })
})
