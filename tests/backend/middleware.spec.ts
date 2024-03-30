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
import { createServer } from 'node:http'
import { RequestFactory, ResponseFactory, HttpContextFactory } from '@adonisjs/core/factories/http'

import { Vite } from '../../index.js'
import { createVite } from './helpers.js'
import adonisjs from '../../src/client/main.js'
import ViteMiddleware from '../../src/vite_middleware.js'

test.group('Vite Middleware', () => {
  test('if route is handled by vite, relay cors headers', async ({ assert, fs }) => {
    await fs.create('resources/js/app.ts', 'console.log("Hello world")')

    const vite = await createVite(
      { buildDirectory: 'foo', manifestFile: 'bar.json' },
      { plugins: [adonisjs({ entrypoints: ['./resources/js/app.ts'] })] }
    )

    const server = createServer(async (req, res) => {
      const middleware = new ViteMiddleware(vite)

      const request = new RequestFactory().merge({ req, res }).create()
      const response = new ResponseFactory().merge({ req, res }).create()
      const ctx = new HttpContextFactory().merge({ request, response }).create()

      response.header('access-control-allow-origin', 'http://test-origin.com')

      await middleware.handle(ctx, () => {})

      ctx.response.finish()
    })

    const res = await supertest(server).get('/resources/js/app.ts')
    assert.equal(res.headers['access-control-allow-origin'], 'http://test-origin.com')

    const resOptions = await supertest(server).options('/resources/js/app.ts')
    assert.equal(resOptions.headers['access-control-allow-origin'], 'http://test-origin.com')
  })

  test('if vite dev server is not available, call next middleware', async ({ assert }) => {
    class FakeVite extends Vite {
      getDevServer() {
        return undefined
      }
    }

    const vite = new FakeVite(false, { buildDirectory: 'foo', manifestFile: 'bar.json' })

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
})
