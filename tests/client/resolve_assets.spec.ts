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
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { build } from 'vite'

import adonisjs from '../../src/client/main.ts'
import { resolveAssets } from '../../src/client/resolve_assets.ts'

async function readManifest(root: string, file = 'public/assets/.vite/manifest.json') {
  const raw = await readFile(join(root, file), 'utf-8')
  return JSON.parse(raw) as Record<string, any>
}

test.group('resolveAssets | shape', () => {
  test('returns [] when input is undefined', ({ assert }) => {
    assert.deepEqual(resolveAssets(undefined), [])
  })

  test('returns [] when input is empty array', ({ assert }) => {
    assert.deepEqual(resolveAssets([]), [])
  })

  test('returns [] when chunks and assets are both empty', ({ assert }) => {
    assert.deepEqual(resolveAssets({ chunks: [], assets: [] }), [])
  })

  test('throws when assets array contains a glob pattern', ({ assert }) => {
    assert.throws(
      () => resolveAssets({ assets: ['./resources/images/*.png'] }),
      /Assets do not support glob patterns/
    )
  })

  test('returns two plugins when chunks are provided', ({ assert }) => {
    const plugins = resolveAssets({ chunks: ['./resources/images/**/*.svg'] })
    assert.lengthOf(plugins, 2)
    assert.equal(plugins[0].name, 'adonisjs:resolve-assets')
    assert.equal(plugins[1].name, 'adonisjs:resolve-assets:manifest')
  })
})

test.group('resolveAssets | chunks (glob)', () => {
  test('glob-expanded chunk files appear in build output', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("ok")')
    await fs.create('resources/images/logo.svg', '<svg></svg>')
    await fs.create('resources/images/icon.svg', '<svg></svg>')

    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [
        adonisjs({
          entrypoints: ['./resources/js/app.ts'],
          assets: { chunks: ['./resources/images/**/*.svg'] },
        }),
      ],
    })

    const manifest = await readManifest(fs.basePath)
    const chunkEntries = Object.values(manifest).filter((c: any) => c.file?.match(/\.(svg|js)$/))
    assert.isAbove(chunkEntries.length, 1)
  })
})

test.group('resolveAssets | assets (raw)', () => {
  test('asset is keyed by source path in manifest', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("ok")')
    await fs.create('resources/images/logo.svg', '<svg>logo</svg>')

    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [
        adonisjs({
          entrypoints: ['./resources/js/app.ts'],
          assets: { assets: ['./resources/images/logo.svg'] },
        }),
      ],
    })

    const manifest = await readManifest(fs.basePath)
    const sourceKey = Object.keys(manifest).find((k) => k.endsWith('resources/images/logo.svg'))
    assert.exists(sourceKey, `expected manifest to contain key ending in resources/images/logo.svg`)
    const entry = manifest[sourceKey!]
    assert.match(entry.file, /logo-.*\.svg$/)
    assert.equal(entry.src, sourceKey)
  })

  test('synthetic underscore key is removed from manifest', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("ok")')
    await fs.create('resources/images/logo.svg', '<svg>logo</svg>')

    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [
        adonisjs({
          entrypoints: ['./resources/js/app.ts'],
          assets: { assets: ['./resources/images/logo.svg'] },
        }),
      ],
    })

    const manifest = await readManifest(fs.basePath)
    const syntheticKeys = Object.keys(manifest).filter((k) => k.startsWith('_logo'))
    assert.lengthOf(syntheticKeys, 0)
  })

  test('emitted asset file is written to disk', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("ok")')
    await fs.create('resources/images/logo.svg', '<svg>logo</svg>')

    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [
        adonisjs({
          entrypoints: ['./resources/js/app.ts'],
          assets: { assets: ['./resources/images/logo.svg'] },
        }),
      ],
    })

    const manifest = await readManifest(fs.basePath)
    const entry = Object.values(manifest).find((c: any) => c.src?.endsWith('logo.svg')) as any
    assert.exists(entry)
    assert.isTrue(existsSync(join(fs.basePath, 'public/assets', entry.file)))
  })

  test('honors custom manifest filename', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("ok")')
    await fs.create('resources/images/logo.svg', '<svg>logo</svg>')

    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [
        adonisjs({
          entrypoints: ['./resources/js/app.ts'],
          assets: { assets: ['./resources/images/logo.svg'] },
        }),
      ],
      build: { manifest: 'custom.json' },
    })

    const manifest = await readManifest(fs.basePath, 'public/assets/custom.json')
    const sourceKey = Object.keys(manifest).find((k) => k.endsWith('resources/images/logo.svg'))
    assert.exists(sourceKey)
  })

  test('does not throw when manifest is disabled', async ({ fs }) => {
    await fs.create('resources/js/app.ts', 'console.log("ok")')
    await fs.create('resources/images/logo.svg', '<svg>logo</svg>')

    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [
        adonisjs({
          entrypoints: ['./resources/js/app.ts'],
          assets: { assets: ['./resources/images/logo.svg'] },
        }),
      ],
      build: { manifest: false },
    })
  })

  test('mixed chunks + assets both surface in manifest', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("ok")')
    await fs.create('resources/images/logo.svg', '<svg>logo</svg>')
    await fs.create('resources/svg/icon.svg', '<svg>icon</svg>')

    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [
        adonisjs({
          entrypoints: ['./resources/js/app.ts'],
          assets: {
            chunks: ['./resources/svg/**/*.svg'],
            assets: ['./resources/images/logo.svg'],
          },
        }),
      ],
    })

    const manifest = await readManifest(fs.basePath)
    const logoKey = Object.keys(manifest).find((k) => k.endsWith('resources/images/logo.svg'))
    assert.exists(logoKey, 'asset key missing')
    const iconEntry = Object.values(manifest).find((c: any) => c.file?.match(/icon.*\.svg$/))
    assert.exists(iconEntry, 'chunk-emitted icon missing from manifest')
  })
})
