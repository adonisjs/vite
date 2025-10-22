/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ViteDevServer } from 'vite'
import type { NextFn } from '@adonisjs/core/types/http'
import type { HttpContext } from '@adonisjs/core/http'

import type { Vite } from './vite.ts'

/**
 * Middleware for proxying requests between AdonisJS and Vite development server
 *
 * Since Vite dev server is integrated within the AdonisJS process, this
 * middleware is used to proxy the requests to it.
 *
 * Some of the requests are directly handled by the Vite dev server,
 * like the one for the assets, while others are passed down to the
 * AdonisJS server.
 */
export default class ViteMiddleware {
  #devServer: ViteDevServer

  /**
   * Creates a new ViteMiddleware instance
   *
   * @param vite - The Vite instance containing the dev server
   *
   * @example
   * const middleware = new ViteMiddleware(viteInstance)
   */
  constructor(protected vite: Vite) {
    this.#devServer = this.vite.getDevServer()!
  }

  /**
   * Handles HTTP requests by proxying them to the Vite dev server when appropriate
   *
   * @param request - The HTTP request object from AdonisJS context
   * @param response - The HTTP response object from AdonisJS context
   * @param next - Function to call the next middleware in the chain
   *
   * @example
   * await middleware.handle(ctx, next)
   */
  async handle({ request, response }: HttpContext, next: NextFn) {
    if (!this.#devServer) {
      return next()
    }

    return new Promise<void>((resolve, reject) => {
      function done(error?: any) {
        response.response.removeListener('finish', done)
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      }

      /**
       * When vite handles the request, we will resolve this promise after the
       * response is sent.
       */
      response.response.addListener('finish', done)

      /**
       * Even if the request is not handled by Vite, we will relay headers
       * to Node.js.
       */
      response.relayHeaders()

      this.#devServer.middlewares.handle(request.request, response.response, async () => {
        /**
         * This callback is invoked when Vite does not handle the request. In that
         * case, we will call next and resolve this promise. Also we remove the
         * unneeded "finish" listener
         */
        response.response.removeListener('finish', done)

        try {
          await next()
          done()
        } catch (error) {
          done(error)
        }
      })
    })
  }
}
