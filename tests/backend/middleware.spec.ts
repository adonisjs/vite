/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import supertest from 'supertest'
import { test } from '@japa/runner'
import type { AddressInfo } from 'node:net'
import { setTimeout } from 'node:timers/promises'
import { createServer, get } from 'node:http'
import { RequestFactory, ResponseFactory, HttpContextFactory } from '@adonisjs/core/factories/http'

import { Vite } from '../../index.ts'
import { createVite } from './helpers.ts'
import adonisjs from '../../src/client/main.ts'
import ViteMiddleware from '../../src/vite_middleware.ts'

test.group('Vite Middleware', () => {
  test('relay response headers when vite handles the request', async ({ assert, fs }) => {
    assert.plan(3)
    await fs.create('resources/js/app.ts', 'console.log("Hello world")')

    const vite = await createVite(
      { buildDirectory: 'foo', manifestFile: 'bar.json' },
      {
        plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })],
      }
    )

    const server = createServer(async (req, res) => {
      const middleware = new ViteMiddleware(vite)

      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      response.header('access-control-allow-origin', 'http://test-origin.com')
      await middleware.handle(ctx, () => {
        throw new Error('Should not call next')
      })

      /**
       * Since Vite has handled the request, the ctx.response.finished will
       * be set to true as soon as the middleware resolves
       */
      assert.isTrue(ctx.response.finished)
      assert.property(ctx.response.response.getHeaders(), 'access-control-allow-origin')
    })

    const res = await supertest(server).get('/resources/js/app.ts')
    assert.equal(res.headers['access-control-allow-origin'], 'http://test-origin.com')
  })

  test('call next middleware when request is not handled by vite', async ({ assert }) => {
    assert.plan(3)

    const vite = await createVite(
      { buildDirectory: 'foo', manifestFile: 'bar.json' },
      { plugins: [] }
    )

    const server = createServer(async (req, res) => {
      const middleware = new ViteMiddleware(vite)

      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      response.header('access-control-allow-origin', 'http://test-origin.com')
      await middleware.handle(ctx, () => {
        assert.isTrue(true)
      })

      /**
       * Since Vite has NOT handled the request, the ctx.response.finished should
       * not be set to true and neither we should relay the headers
       */
      assert.isFalse(ctx.response.finished)
      // assert.notProperty(ctx.response.response.getHeaders(), 'access-control-allow-origin')

      /**
       * This is incorrect. The header shouldn't exist until "ctx.response.finish" is
       * called.
       */
      assert.property(ctx.response.response.getHeaders(), 'access-control-allow-origin')
      ctx.response.finish()
    })

    await supertest(server).get('/resources/js/app.ts')
  })

  test('settle when the client aborts the request before vite finishes', async ({ assert }) => {
    const vite = await createVite(
      { buildDirectory: 'foo', manifestFile: 'bar.json' },
      {
        plugins: [
          {
            name: 'slow-asset',
            configureServer(server) {
              server.middlewares.use((_, res) => res.writeHead(200).flushHeaders())
            },
          },
        ],
      }
    )

    const { promise: handled, resolve } = Promise.withResolvers<void>()
    const server = createServer((req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      new ViteMiddleware(vite).handle(ctx, () => {}).then(resolve)
    })

    await new Promise<void>((listening) => server.listen(0, listening))
    const { port } = server.address() as AddressInfo

    /**
     * Abort as soon as the headers arrive, so Node emits "close" on the
     * response without ever emitting "finish"
     */
    get(`http://localhost:${port}/slow.js`, (res) => res.destroy()).on('error', () => {})

    const settled = await Promise.race([
      handled.then(() => true),
      setTimeout(1000).then(() => false),
    ])
    server.close()
    assert.isTrue(settled)
  })

  test('do not call next when the client aborts before vite passes the request', async ({
    assert,
  }) => {
    const received = Promise.withResolvers<void>()
    const vite = await createVite(
      { buildDirectory: 'foo', manifestFile: 'bar.json' },
      {
        plugins: [
          {
            name: 'late-pass',
            configureServer(server) {
              server.middlewares.use((_, res, next) => {
                received.resolve()
                res.once('close', () => next())
              })
            },
          },
        ],
      }
    )

    let nextCalled = false
    const { promise: handled, resolve } = Promise.withResolvers<void>()
    const server = createServer((req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      new ViteMiddleware(vite)
        .handle(ctx, () => {
          nextCalled = true
        })
        .then(resolve)
    })

    await new Promise<void>((listening) => server.listen(0, listening))
    const { port } = server.address() as AddressInfo

    const clientRequest = get(`http://localhost:${port}/page`).on('error', () => {})
    await received.promise
    clientRequest.destroy()

    await handled
    await setTimeout(50)
    server.close()
    assert.isFalse(nextCalled)
  })

  test('settle when the client is gone before the middleware runs', async ({ assert }) => {
    const vite = await createVite({ buildDirectory: 'foo', manifestFile: 'bar.json' })

    const received = Promise.withResolvers<void>()
    const { promise: handled, resolve } = Promise.withResolvers<void>()
    const server = createServer((req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      received.resolve()
      res.once('close', () => new ViteMiddleware(vite).handle(ctx, () => {}).then(resolve))
    })

    await new Promise<void>((listening) => server.listen(0, listening))
    const { port } = server.address() as AddressInfo

    const clientRequest = get(`http://localhost:${port}/@vite/client`).on('error', () => {})
    await received.promise
    clientRequest.destroy()

    const settled = await Promise.race([
      handled.then(() => true),
      setTimeout(1000).then(() => false),
    ])
    server.close()
    assert.isTrue(settled)
  })

  test('if vite dev server is not available, call next middleware', async ({ assert }) => {
    class FakeVite extends Vite {
      getDevServer() {
        return undefined
      }
    }

    const vite = new FakeVite({ buildDirectory: 'foo', manifestFile: 'bar.json' })

    const server = createServer(async (req, res) => {
      const middleware = new ViteMiddleware(vite)

      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await middleware.handle(ctx, () => {
        ctx.response.status(200).send('handled by next middleware')
      })

      ctx.response.finish()
    })

    const res = await supertest(server).get('/resources/js/app.ts')
    assert.equal(res.text, 'handled by next middleware')
  })

  test('call getDevServer for each request rather than cache it', async ({ assert, fs }) => {
    await fs.create('resources/js/app.ts', 'console.log("Hello world")')

    const vite = await createVite(
      { buildDirectory: 'foo', manifestFile: 'bar.json' },
      {
        plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })],
      }
    )

    const originalGetDevServer = vite.getDevServer.bind(vite)
    vite.getDevServer = () => undefined

    const middleware = new ViteMiddleware(vite)

    const server = createServer(async (req, res) => {
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await middleware.handle(ctx, () => {
        ctx.response.status(200).send('vite server not ready, handled by next middleware')
      })

      if (!ctx.response.finished) {
        ctx.response.finish()
      }
    })

    // Simulate vite server not yet ready
    const firstRes = await supertest(server).get('/resources/js/app.ts')
    assert.equal(firstRes.text, 'vite server not ready, handled by next middleware')

    // Simulate vite server now ready
    vite.getDevServer = originalGetDevServer

    const secondRes = await supertest(server).get('/resources/js/app.ts')
    assert.include(secondRes.text, 'Hello world')
  })

  test('proxy /@vite/client request through middleware', async ({ assert, fs }) => {
    await fs.create('resources/js/app.ts', 'console.log("Hello world")')

    const vite = await createVite(
      { buildDirectory: 'foo', manifestFile: 'bar.json' },
      { plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })] }
    )

    const server = createServer(async (req, res) => {
      const middleware = new ViteMiddleware(vite)
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await middleware.handle(ctx, () => {
        ctx.response.status(404).send('not handled by vite')
      })
    })

    const res = await supertest(server).get('/@vite/client')
    assert.equal(res.status, 200)
    assert.match(res.headers['content-type'], /javascript/)
  })

  test('proxy a typescript entrypoint and return transformed JS', async ({ assert, fs }) => {
    await fs.create('resources/js/app.ts', `export const hello: string = 'world'`)

    const vite = await createVite(
      { buildDirectory: 'foo', manifestFile: 'bar.json' },
      { plugins: [adonisjs({ entryPoints: ['./resources/js/app.ts'] })] }
    )

    const server = createServer(async (req, res) => {
      const middleware = new ViteMiddleware(vite)
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await middleware.handle(ctx, () => {
        ctx.response.status(404).send('not handled by vite')
      })
    })

    const res = await supertest(server).get('/resources/js/app.ts')
    assert.equal(res.status, 200)
    assert.match(res.headers['content-type'], /javascript/)
    assert.include(res.text, 'hello')
    assert.notInclude(res.text, ': string')
  })

  test('proxy a CSS file through middleware', async ({ assert, fs }) => {
    await fs.create('resources/css/app.css', 'body { color: red }')

    const vite = await createVite(
      { buildDirectory: 'foo', manifestFile: 'bar.json' },
      { plugins: [adonisjs({ entryPoints: ['./resources/css/app.css'] })] }
    )

    const server = createServer(async (req, res) => {
      const middleware = new ViteMiddleware(vite)
      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      await middleware.handle(ctx, () => {
        ctx.response.status(404).send('not handled by vite')
      })
    })

    const res = await supertest(server).get('/resources/css/app.css')
    assert.equal(res.status, 200)
  })
})
