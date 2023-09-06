/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Edge } from 'edge.js'
import type { ApplicationService } from '@adonisjs/core/types'

import debug from '../src/backend/debug.js'
import type { cspKeywords } from '@adonisjs/shield'
import type { ViteOptions } from '../src/backend/types/main.js'

export default class ViteServiceProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Returns edge when it's installed
   */
  protected async getEdge(): Promise<Edge | null> {
    try {
      const { default: edge } = await import('edge.js')
      debug('Detected edge.js package. Adding Vite primitives to it')
      return edge
    } catch {
      return null
    }
  }

  /**
   * Returns shield CSP keywords, when the package is installed
   */
  protected async getShieldCspKeywords(): Promise<typeof cspKeywords | null> {
    try {
      const { cspKeywords } = await import('@adonisjs/shield')
      debug('Detected @adonisjs/shield package. Adding Vite keywords for CSP policy')
      return cspKeywords
    } catch {
      return null
    }
  }

  register() {
    this.app.container.singleton('vite', async () => {
      const { Vite } = await import('../src/backend/vite.js')
      const config = this.app.config.get<ViteOptions>('vite')

      return new Vite({
        ...config,
        buildDirectory: this.app.makePath(config.buildDirectory || 'public/build'),
        hotFile: this.app.makePath(config.hotFile || 'public/build/hot.json'),
      })
    })
  }

  /**
   * Extending edge
   */
  async boot() {
    const edge = await this.getEdge()

    if (edge) {
      const vite = await this.app.container.make('vite')
      const { edgePluginVite } = await import('../src/backend/edge_plugin_vite.js')
      edge.use(edgePluginVite(vite))
    }

    const cspKeywords = await this.getShieldCspKeywords()
    if (cspKeywords) {
      const vite = await this.app.container.make('vite')

      /**
       * Registering the @viteUrl keyword for CSP directives.
       * Returns http URL to the dev or the CDN server, otherwise
       * an empty string
       */
      cspKeywords.register('@viteUrl', function () {
        const assetsURL = vite.assetsUrl()
        if (!assetsURL || !assetsURL.startsWith('http://') || assetsURL.startsWith('https://')) {
          return ''
        }

        return assetsURL
      })

      /**
       * Registering the @viteDevUrl keyword for the CSP directives.
       * Returns the dev server URL in development and empty string
       * in prod
       */
      cspKeywords.register('@viteDevUrl', function () {
        return vite.devUrl()
      })

      /**
       * Registering the @viteHmrUrl keyword for the CSP directives.
       * Returns the Websocket URL for the HMR server
       */
      cspKeywords.register('@viteHmrUrl', function () {
        return vite.devUrl().replace('http://', 'ws://').replace('https://', 'wss://')
      })
    }
  }
}
