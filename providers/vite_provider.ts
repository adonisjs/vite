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

import { Vite } from '../src/vite.ts'
import type { ViteOptions } from '../src/types.ts'
import ViteMiddleware from '../src/vite_middleware.ts'

declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    vite: Vite
  }
}

/**
 * AdonisJS service provider for integrating Vite build tool and development server
 *
 * Handles lifecycle management of Vite integration including:
 * - Registering Vite service in the container
 * - Setting up Edge.js plugin for template integration
 * - Managing development server startup/shutdown
 * - Configuring CSP keywords for @adonisjs/shield
 */
export default class ViteProvider {
  /**
   * Flag indicating whether the Vite development server should be started
   * Set to true when manifest file doesn't exist and running in web/test environment
   */
  #shouldRunViteDevServer = false

  /**
   * Creates a new ViteProvider instance
   *
   * @param app - The AdonisJS application service instance
   *
   * @example
   * const provider = new ViteProvider(app)
   */
  constructor(protected app: ApplicationService) {}

  /**
   * Registers the Vite Edge.js plugin if Edge.js is available in the application
   *
   * Adds global helpers and custom tags (@vite, @viteReactRefresh) to Edge templates.
   * Only registers the plugin if the application is using Edge.js.
   *
   * @example
   * await provider.registerEdgePlugin()
   * // Enables @vite('app.js') in Edge templates
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
   * Registers Content Security Policy keywords when @adonisjs/shield is installed
   *
   * Adds the '@viteUrl' keyword for CSP directives that returns the Vite assets URL
   * when it's an HTTP/HTTPS URL, or an empty string otherwise.
   *
   * @example
   * await provider.registerShieldKeywords()
   * // Enables @viteUrl in CSP directives
   */
  protected async registerShieldKeywords() {
    let cspKeywords: typeof ShieldCSPKeywords | null = null
    try {
      const shieldExports = await import('@adonisjs/shield')
      cspKeywords = shieldExports.cspKeywords
    } catch {}

    if (!cspKeywords) {
      return
    }

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
   * Registers Vite service and middleware bindings in the IoC container
   *
   * Creates a Vite instance using configuration and determines whether
   * the development server should run based on environment and manifest file presence.
   *
   * @example
   * provider.register()
   * // Vite service is now available via container.make('vite')
   */
  register() {
    const appEnvironment = this.app.getEnvironment()

    const vite = new Vite(this.app.config.get<ViteOptions>('vite'))

    /**
     * DEV_MODE is injected when the dev server is started
     * by assembler
     */
    this.#shouldRunViteDevServer = appEnvironment === 'test' || !!process.env.DEV_MODE
    this.app.container.singleton(Vite, () => vite)
    this.app.container.singleton(ViteMiddleware, () => new ViteMiddleware(vite))
    this.app.container.alias('vite', Vite)
  }

  /**
   * Boots the Vite provider by registering plugins and integrations
   *
   * Registers Edge.js plugin and Shield CSP keywords if the respective
   * packages are available in the application.
   *
   * @example
   * await provider.boot()
   */
  async boot() {
    await this.registerEdgePlugin()
    await this.registerShieldKeywords()
  }

  /**
   * Starts the Vite development server before the application starts accepting requests
   *
   * @example
   * await provider.start()
   */
  async start() {
    if (!this.#shouldRunViteDevServer) {
      return
    }

    const vite = await this.app.container.make('vite')
    await vite.createDevServer()
  }

  /**
   * Gracefully stops the Vite development server during application shutdown
   *
   * Only attempts to stop the server if it was started during the start phase.
   * Ensures clean shutdown of the development server and its resources.
   *
   * @example
   * await provider.shutdown()
   */
  async shutdown() {
    if (!this.#shouldRunViteDevServer) {
      return
    }

    const vite = await this.app.container.make('vite')
    await vite.stopDevServer()
  }
}
