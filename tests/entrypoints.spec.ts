import { test } from '@japa/runner'
import { build, createServer, InlineConfig } from 'vite'
import Adonis from '../src'
import { Filesystem } from '@poppinss/dev-utils'
import { join, resolve } from 'path'

const fs = new Filesystem(join(__dirname, 'app'))
const BASE_CONFIG = { root: fs.basePath, logLevel: 'silent' } as InlineConfig

test.group('Entrypoints', (group) => {
  group.each.teardown(() => fs.cleanup())

  test('Should write entrypoints.json file in dev', async ({ assert }) => {
    await fs.add(join(fs.basePath, 'resources/js/app.ts'), 'console.log("Hello world")')
    await fs.add(join(fs.basePath, 'resources/css/app.css'), 'body { background: red }')

    const server = await createServer({
      ...BASE_CONFIG,
      plugins: [Adonis({ entryPoints: { app: ['resources/js/app.ts', 'resources/css/app.css'] } })],
    })

    await server.listen(9484)
    await server.close()

    const entrypoints = JSON.parse(await fs.get('public/assets/entrypoints.json'))

    assert.deepEqual(entrypoints, {
      url: 'http://localhost:9484',
      entrypoints: {
        app: {
          css: ['http://localhost:9484/resources/css/app.css'],
          js: ['http://localhost:9484/resources/js/app.ts'],
        },
      },
    })
  })

  test('Should resolve real dev server url', async ({ assert }) => {
    await fs.add(join(fs.basePath, 'resources/js/app.ts'), 'console.log("Hello world")')

    const server = await createServer({
      ...BASE_CONFIG,
      plugins: [Adonis({ entryPoints: { app: ['resources/js/app.ts'] } })],
    })

    await server.listen(5278)
    await server.close()

    const entrypoints = JSON.parse(await fs.get('public/assets/entrypoints.json'))

    assert.deepEqual(entrypoints, {
      url: 'http://localhost:5278',
      entrypoints: {
        app: {
          css: [],
          js: ['http://localhost:5278/resources/js/app.ts'],
        },
      },
    })
  })

  test('Should write entrypoints.json file in build mode', async ({ assert }) => {
    await fs.add(join(fs.basePath, 'resources/js/app.ts'), 'console.log("Hello world")')

    await build({
      ...BASE_CONFIG,
      plugins: [
        Adonis({
          publicPath: 'https://cdn.example.com',
          entryPoints: { app: [resolve(__dirname, './app/resources/js/app.ts')] },
        }),
      ],
    })

    const entrypoints = JSON.parse(await fs.get('public/assets/entrypoints.json'))

    assert.deepEqual(entrypoints.url, 'https://cdn.example.com')
    assert.match(
      entrypoints.entrypoints.app.js[0],
      /https:\/\/cdn\.example\.com\/app\.[a-z0-9]{8}\.js/
    )
  })

  test('CDN with suffix', async ({ assert }) => {
    await fs.add(join(fs.basePath, 'resources/js/app.ts'), 'console.log("Hello world")')

    await build({
      ...BASE_CONFIG,
      plugins: [
        Adonis({
          publicPath: 'https://cdn.example.com/assets',
          entryPoints: { app: [resolve(__dirname, './app/resources/js/app.ts')] },
        }),
      ],
    })

    const entrypoints = JSON.parse(await fs.get('public/assets/entrypoints.json'))

    assert.deepEqual(entrypoints.url, 'https://cdn.example.com/assets')
    assert.match(
      entrypoints.entrypoints.app.js[0],
      /https:\/\/cdn\.example\.com\/assets\/app\.[a-z0-9]{8}\.js/
    )
  })

  test('Entrypoints without cdn', async ({ assert }) => {
    await fs.add(join(fs.basePath, 'resources/js/app.ts'), 'console.log("Hello world")')

    await build({
      ...BASE_CONFIG,
      plugins: [
        Adonis({
          publicPath: '/assets',
          entryPoints: { app: [resolve(__dirname, './app/resources/js/app.ts')] },
        }),
      ],
    })

    const entrypoints = JSON.parse(await fs.get('public/assets/entrypoints.json'))

    assert.deepEqual(entrypoints.url, '/assets')
    assert.match(entrypoints.entrypoints.app.js[0], /\/assets\/app\.[a-z0-9]{8}\.js/)
  })

  test('Multiple entrypoints', async ({ assert }) => {
    await fs.add(join(fs.basePath, 'resources/js/app.ts'), 'console.log("Hello world")')
    await fs.add(join(fs.basePath, 'resources/js/admin.ts'), 'console.log("Hello world")')

    await build({
      ...BASE_CONFIG,
      plugins: [
        Adonis({
          publicPath: '/assets',
          entryPoints: {
            app: [resolve(__dirname, './app/resources/js/app.ts')],
            admin: [resolve(__dirname, './app/resources/js/admin.ts')],
          },
        }),
      ],
    })

    const entrypoints = JSON.parse(await fs.get('public/assets/entrypoints.json'))

    assert.deepEqual(entrypoints.url, '/assets')
    assert.match(entrypoints.entrypoints.app.js[0], /\/assets\/app\.[a-z0-9]{8}\.js/)
    assert.match(entrypoints.entrypoints.admin.js[0], /\/assets\/admin\.[a-z0-9]{8}\.js/)
  })

  test('Filter CSS and JS files', async ({ assert }) => {
    await fs.add(join(fs.basePath, 'resources/js/a.ts'), 'console.log("Hello world")')
    await fs.add(join(fs.basePath, 'resources/js/b.js'), 'console.log("Hello world")')
    await fs.add(join(fs.basePath, 'resources/css/c.css'), 'body { background: red }')
    await fs.add(join(fs.basePath, 'resources/css/d.scss'), 'body { background: red }')

    await build({
      ...BASE_CONFIG,
      plugins: [
        Adonis({
          publicPath: '/assets',
          entryPoints: {
            app: [
              resolve(__dirname, './app/resources/js/a.ts'),
              resolve(__dirname, './app/resources/js/b.js'),
              resolve(__dirname, './app/resources/css/c.css'),
              resolve(__dirname, './app/resources/css/d.scss'),
            ],
          },
        }),
      ],
    })

    const entrypoints = JSON.parse(await fs.get('public/assets/entrypoints.json'))

    assert.deepEqual(entrypoints.url, '/assets')
    assert.match(entrypoints.entrypoints.app.js[0], /\/assets\/a\.[a-z0-9]{8}\.js/)
    assert.match(entrypoints.entrypoints.app.js[1], /\/assets\/b\.[a-z0-9]{8}\.js/)
    assert.match(entrypoints.entrypoints.app.css[0], /\/assets\/c\.[a-z0-9]{8}\.css/)
    assert.match(entrypoints.entrypoints.app.css[1], /\/assets\/d\.[a-z0-9]{8}\.css/)
  })

  test('Multiple entrypoints with shared files', async ({ assert }) => {
    await fs.add(join(fs.basePath, 'resources/js/app.ts'), 'console.log("Hello world")')
    await fs.add(join(fs.basePath, 'resources/js/admin.ts'), 'console.log("Hello world")')
    await fs.add(join(fs.basePath, 'resources/js/shared.ts'), 'console.log("Hello world")')

    await build({
      ...BASE_CONFIG,
      plugins: [
        Adonis({
          publicPath: '/assets',
          entryPoints: {
            app: [
              resolve(__dirname, './app/resources/js/app.ts'),
              resolve(__dirname, './app/resources/js/shared.ts'),
            ],
            admin: [
              resolve(__dirname, './app/resources/js/admin.ts'),
              resolve(__dirname, './app/resources/js/shared.ts'),
            ],
          },
        }),
      ],
    })

    const entrypoints = JSON.parse(await fs.get('public/assets/entrypoints.json'))

    assert.deepEqual(entrypoints.entrypoints.app.js.length, 2)
    assert.deepEqual(entrypoints.entrypoints.admin.js.length, 2)
  })

  test('Internal css import should be inclued in entrypoints[name].css', async ({ assert }) => {
    await fs.add(join(fs.basePath, 'resources/js/app.ts'), 'import "../css/app.css"')
    await fs.add(join(fs.basePath, 'resources/js/admin.ts'), 'import "../css/app.css"')
    await fs.add(join(fs.basePath, 'resources/css/app.css'), 'body { background: red }')

    await build({
      ...BASE_CONFIG,
      plugins: [
        Adonis({
          publicPath: '/assets',
          entryPoints: {
            app: [resolve(__dirname, './app/resources/js/app.ts')],
            admin: [resolve(__dirname, './app/resources/js/admin.ts')],
          },
        }),
      ],
    })

    const entrypoints = JSON.parse(await fs.get('public/assets/entrypoints.json'))

    assert.deepEqual(entrypoints.entrypoints.app.css.length, 1)
    assert.deepEqual(entrypoints.entrypoints.admin.css.length, 1)
  })
})
