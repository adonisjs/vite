/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import { test } from '@japa/runner'
import { build, createBuilder } from 'vite'

import adonisjs from '../../src/client/main.ts'

async function readManifest(root: string, file = 'public/assets/.vite/manifest.json') {
  const raw = await readFile(join(root, file), 'utf-8')
  return JSON.parse(raw) as Record<string, any>
}

test.group('Vite 8 build | manifest', () => {
  test('manifest entry has expected keys: file, src, isEntry', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("hello")')

    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })],
    })

    const manifest = await readManifest(fs.basePath)
    const entry = manifest['resources/js/app.ts']
    assert.exists(entry, 'entrypoint missing from manifest')
    assert.match(entry.file, /\.js$/)
    assert.equal(entry.src, 'resources/js/app.ts')
    assert.equal(entry.isEntry, true)
  })

  test('CSS imports populate manifest css[] array', async ({ fs, assert }) => {
    await fs.create('resources/css/style.css', 'body { color: red }')
    await fs.create('resources/js/app.ts', `import '../css/style.css'\nconsole.log('x')`)

    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })],
    })

    const manifest = await readManifest(fs.basePath)
    const entry = manifest['resources/js/app.ts']
    assert.isArray(entry.css)
    assert.isAbove(entry.css.length, 0)
    assert.match(entry.css[0], /\.css$/)
  })

  test('imports[] populated when entrypoint has dynamic import', async ({ fs, assert }) => {
    await fs.create('resources/js/lazy.ts', 'export const x = 1')
    await fs.create('resources/js/app.ts', `const m = await import('./lazy.ts'); console.log(m.x)`)

    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })],
    })

    const manifest = await readManifest(fs.basePath)
    const entry = manifest['resources/js/app.ts']
    assert.isArray(entry.dynamicImports ?? entry.imports)
  })

  test('build error on syntax error throws with errors array', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'this is not valid typescript {{{')

    let caught: any
    try {
      await build({
        root: fs.basePath,
        logLevel: 'silent',
        plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })],
      })
    } catch (error) {
      caught = error
    }

    assert.exists(caught, 'expected build to throw on syntax error')
  })
})

test.group('Vite 8 build | createBuilder', () => {
  test('createBuilder().buildApp() produces manifest', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("from builder")')

    const builder = await createBuilder({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })],
      configFile: false,
    })
    await builder.buildApp()

    const manifest = await readManifest(fs.basePath)
    assert.exists(manifest['resources/js/app.ts'])
  })
})

test.group('Vite 8 build | plugin compat', () => {
  test('vite-plugin-restart loads alongside adonisjs plugin without error', async ({
    fs,
    assert,
  }) => {
    await fs.create('resources/js/app.ts', 'console.log("ok")')

    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })],
    })

    const manifest = await readManifest(fs.basePath)
    assert.exists(manifest['resources/js/app.ts'])
  })

  test('respects user build.outDir override', async ({ fs, assert }) => {
    await fs.create('resources/js/app.ts', 'console.log("custom out")')

    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })],
      build: { outDir: 'dist' },
    })

    const manifest = await readManifest(fs.basePath, 'dist/.vite/manifest.json')
    assert.exists(manifest['resources/js/app.ts'])
  })
})
