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

import { Vite } from '../../index.ts'
import { createVite } from './helpers.ts'
import { defineConfig } from '../../src/define_config.ts'
import { configHook } from '../../src/client/config.ts'
import { BundledModuleResolver } from '../../src/server_modules/bundled_module_resolver.ts'

test.group('Vite | loadServerModule (dev)', () => {
  test('imports a TypeScript module via the dev module runner', async ({ assert, fs }) => {
    await fs.create(
      'ssr.ts',
      `export default { greet: (name: string) => 'hello ' + name }
       export const value = 42`
    )

    const vite = await createVite(defineConfig({}))
    const mod = await vite.loadServerModule<{
      default: { greet: (n: string) => string }
      value: number
    }>('/ssr.ts')

    assert.equal(mod.value, 42)
    assert.equal(mod.default.greet('world'), 'hello world')
  })

  test('imports a JSX module after Vite transform', async ({ assert, fs }) => {
    await fs.create(
      'render.tsx',
      `export default () => ({ tag: 'div', kids: ['hi'] })`
    )

    const vite = await createVite(defineConfig({}))
    const mod = await vite.loadServerModule<{ default: () => any }>('/render.tsx')

    assert.deepEqual(mod.default(), { tag: 'div', kids: ['hi'] })
  })

  test('reuses the same runner across calls', async ({ assert, fs }) => {
    await fs.create('a.ts', `export const v = 1`)
    await fs.create('b.ts', `export const v = 2`)

    const vite = await createVite(defineConfig({}))
    const a = await vite.loadServerModule<{ v: number }>('/a.ts')
    const b = await vite.loadServerModule<{ v: number }>('/b.ts')

    assert.equal(a.v, 1)
    assert.equal(b.v, 2)
  })

  test('fresh: true forces re-evaluation of cached modules', async ({ assert, fs }) => {
    await fs.create('counter.ts', `export const ts = Date.now() + Math.random()`)

    const vite = await createVite(defineConfig({}))
    const first = await vite.loadServerModule<{ ts: number }>('/counter.ts')
    const cached = await vite.loadServerModule<{ ts: number }>('/counter.ts')
    const fresh = await vite.loadServerModule<{ ts: number }>('/counter.ts', { fresh: true })

    assert.equal(first.ts, cached.ts, 'expected default import to share cached instance')
    assert.notEqual(first.ts, fresh.ts, 'expected fresh: true to re-evaluate the module')
  })
})

test.group('Vite | loadServerModule (prod)', () => {
  test('imports the bundle pointed to by the SSR manifest', async ({ assert, fs }) => {
    await fs.create('public/assets/server/ssr.js', `export default { msg: 'from-bundle' }`)
    await fs.create(
      'public/assets/server/.vite/manifest.json',
      JSON.stringify({
        'inertia/ssr.ts': { file: 'ssr.js', isEntry: true, src: 'inertia/ssr.ts' },
      })
    )

    const vite = new Vite(defineConfig({ buildDirectory: join(fs.basePath, 'public/assets') }))
    const mod = await vite.loadServerModule<{ default: { msg: string } }>('inertia/ssr.ts')

    assert.equal(mod.default.msg, 'from-bundle')
  })

  test('caches the import promise per entry', async ({ assert, fs }) => {
    await fs.create(
      'public/assets/server/once.js',
      `globalThis.__loadCount = (globalThis.__loadCount ?? 0) + 1
       export const count = globalThis.__loadCount`
    )
    await fs.create(
      'public/assets/server/.vite/manifest.json',
      JSON.stringify({
        'once.ts': { file: 'once.js', isEntry: true, src: 'once.ts' },
      })
    )

    const vite = new Vite(defineConfig({ buildDirectory: join(fs.basePath, 'public/assets') }))
    const a = await vite.loadServerModule<{ count: number }>('once.ts')
    const b = await vite.loadServerModule<{ count: number }>('once.ts')

    assert.equal(a.count, b.count, 'expected the bundle to load only once')
  })

  test('throws when entry is not present in the manifest', async ({ assert, fs }) => {
    await fs.create('public/assets/server/.vite/manifest.json', JSON.stringify({}))

    const resolver = new BundledModuleResolver(join(fs.basePath, 'public/assets'))

    await assert.rejects(
      () => resolver.import('missing.ts'),
      /no chunk for this entry in the SSR manifest/
    )
  })

  test('throws when the SSR manifest is missing on disk', async ({ assert, fs }) => {
    const resolver = new BundledModuleResolver(join(fs.basePath, 'public/assets'))

    await assert.rejects(() => resolver.import('any.ts'), /SSR manifest not found at /)
  })
})

test.group('Vite | configHook serverEntrypoints', () => {
  test('does not configure ssr environment when serverEntrypoints is empty', ({ assert }) => {
    const result = configHook(
      {
        assetsUrl: '/assets',
        buildDirectory: 'public/assets',
        reload: [],
        entrypoints: ['app.ts'],
        serverEntrypoints: [],
      },
      { root: '/project' },
      { command: 'build' } as any
    )

    assert.notProperty(result, 'environments')
  })

  test('configures ssr environment when serverEntrypoints is non-empty', ({ assert }) => {
    const result = configHook(
      {
        assetsUrl: '/assets',
        buildDirectory: 'public/assets',
        reload: [],
        entrypoints: ['app.ts'],
        serverEntrypoints: ['inertia/ssr.ts'],
      },
      { root: '/project' },
      { command: 'build' } as any
    )

    assert.deepEqual(result.environments?.ssr?.build, {
      ssr: true,
      emptyOutDir: true,
      emitAssets: false,
      manifest: true,
      outDir: join('public/assets', 'server'),
      rolldownOptions: {
        input: [join('/project', 'inertia/ssr.ts')],
      },
    })
  })

  test('respects user-supplied ssr build values', ({ assert }) => {
    const result = configHook(
      {
        assetsUrl: '/assets',
        buildDirectory: 'public/assets',
        reload: [],
        entrypoints: ['app.ts'],
        serverEntrypoints: ['inertia/ssr.ts'],
      },
      {
        root: '/project',
        environments: {
          ssr: {
            build: {
              outDir: 'custom/server',
              manifest: 'custom-manifest.json',
              rolldownOptions: { input: { custom: '/project/other.ts' } },
            },
          },
        },
      },
      { command: 'build' } as any
    )

    assert.equal(result.environments?.ssr?.build?.outDir, 'custom/server')
    assert.equal(result.environments?.ssr?.build?.manifest, 'custom-manifest.json')
    assert.deepEqual(result.environments?.ssr?.build?.rolldownOptions?.input, {
      custom: '/project/other.ts',
    })
  })
})
