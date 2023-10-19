/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ViteOptions } from './types.js'

/**
 * Define the backend config for resolving vite assets
 */
export function defineConfig(config: Partial<ViteOptions>): ViteOptions {
  return {
    buildDirectory: 'public/assets',
    hotFile: 'public/assets/hot.json',
    assetsUrl: '/assets',
    ...config,
  }
}
