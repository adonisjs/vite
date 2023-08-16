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
import type { ViteOptions } from '../src/backend/types/main.js'
import debug from '../src/backend/debug.js'

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
  }
}
