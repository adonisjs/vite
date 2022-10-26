import { test } from '@japa/runner'
import { build, createServer } from 'vite'
import Adonis from '../src'
import { Filesystem } from '@poppinss/dev-utils'
import { join } from 'path'

const fs = new Filesystem(join(__dirname, 'app'))

test.group('Entrypoints', (group) => {
  group.each.teardown(() => fs.cleanup())

  test('Should write entrypoints.json file in dev', async ({ assert }) => {
    await fs.add(join(fs.basePath, 'resources/js/app.ts'), 'console.log("Hello world")')

    const server = await createServer({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [Adonis({ entryPoints: { app: ['resources/js/app.ts'] } })],
    })

    await server.listen(9484)
    await server.close()

    const entrypoints = JSON.parse(await fs.get('public/assets/entrypoints.json'))

    assert.deepEqual(entrypoints, {
      url: 'http://localhost:9484',
      entrypoints: {
        __entrypoint_app_0__: 'http://localhost:9484/resources/js/app.ts',
      },
    })
  })

  test('Should resolve real dev server url', async ({ assert }) => {
    await fs.add(join(fs.basePath, 'resources/js/app.ts'), 'console.log("Hello world")')

    const server = await createServer({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [Adonis({ entryPoints: { app: ['resources/js/app.ts'] } })],
    })

    await server.listen(5278)
    await server.close()

    const entrypoints = JSON.parse(await fs.get('public/assets/entrypoints.json'))

    assert.deepEqual(entrypoints, {
      url: 'http://localhost:5278',
      entrypoints: {
        __entrypoint_app_0__: 'http://localhost:5278/resources/js/app.ts',
      },
    })
  })

  test('Should also write the file in build mode with correct publicPath', async ({ assert }) => {
    await fs.add(join(fs.basePath, 'resources/js/app.ts'), 'console.log("Hello world")')

    await build({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [Adonis({ publicPath: '/assets', entryPoints: { app: ['resources/js/app.ts'] } })],
    })

    const entrypoints = JSON.parse(await fs.get('public/assets/entrypoints.json'))

    assert.deepEqual(entrypoints, {
      url: 'http://localhost:5173',
      entrypoints: {
        __entrypoint_app_0__: 'http://localhost:5173/assets/resources/js/app.ts',
      },
    })
  }).skip()
})
