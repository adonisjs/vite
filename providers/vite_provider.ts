/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ApplicationService } from '@adonisjs/core/types'
import type { cspKeywords as ShieldCSPKeywords } from '@adonisjs/shield'

import { Vite } from '../src/vite.js'
import type { ViteOptions } from '../src/types.js'
import ViteMiddleware from '../src/vite_middleware.js'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    vite: Vite
  }
}

export default class ViteProvider {
  #shouldRunViteDevServer = false

  constructor(protected app: ApplicationService) {}

  /**
   * Registers edge plugin when edge is installed
   */
  protected async registerEdgePlugin() {
    if (this.app.usingEdgeJS) {
      const edge = await import('edge.js')
      const vite = await this.app.container.make('vite')
      const { edgePluginVite } = await import('../src/plugins/edge.js')
      edge.default.use(edgePluginVite(vite))
    }
  }

  /**
   * Registers CSP keywords when @adonisjs/shield is installed
   */
  protected async registerShieldKeywords() {
    let cspKeywords: typeof ShieldCSPKeywords | null = null
    try {
      const shieldExports = await import('@adonisjs/shield')
      cspKeywords = shieldExports.cspKeywords
    } catch {}

    if (!cspKeywords) return

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
  }

  /**
   * Register Vite bindings
   */
  register() {
    const appEnvironment = this.app.getEnvironment()
    const isWebOrTestEnvironment = appEnvironment === 'web' || appEnvironment === 'test'

    const vite = new Vite(this.app.config.get<ViteOptions>('vite'))
    this.#shouldRunViteDevServer = !vite.hasManifestFile && isWebOrTestEnvironment

    this.app.container.bind('vite', () => vite)
    this.app.container.singleton(ViteMiddleware, () => new ViteMiddleware(vite))
  }

  /**
   * - Register edge tags
   * - Start Vite server when running in development or test
   */
  async boot() {
    await this.registerEdgePlugin()

    if (!this.#shouldRunViteDevServer) return

    const vite = await this.app.container.make('vite')
    await vite.createDevServer()
  }

  /**
   * Stop Vite server when running in development or test
   */
  async shutdown() {
    if (!this.#shouldRunViteDevServer) return

    const vite = await this.app.container.make('vite')
    await vite.stopDevServer()
  }
}
