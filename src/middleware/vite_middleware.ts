/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ViteDevServer } from 'vite'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

import type { Vite } from '../vite.js'

/**
 * Since Vite dev server is integrated within the AdonisJS process, this
 * middleware is used to proxy the requests to it.
 *
 * Some of the requests are directly handled by the Vite dev server,
 * like the one for the assets, while others are passed down to the
 * AdonisJS server.
 */
export default class ViteMiddleware {
  #devServer: ViteDevServer

  constructor(protected vite: Vite) {
    this.#devServer = this.vite.getDevServer()!
  }

  async handle({ request, response }: HttpContext, next: NextFn) {
    return await new Promise((resolve) => {
      this.#devServer.middlewares.handle(request.request, response.response, () => {
        return resolve(next())
      })
    })
  }
}
