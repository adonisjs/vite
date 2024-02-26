/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'

import type { ViteOptions } from './types.js'

/**
 * Define the backend config for Vite
 */
export function defineConfig(config: Partial<ViteOptions>): ViteOptions {
  return {
    buildDirectory: 'public/assets',
    assetsUrl: '/assets',
    manifestFile: config.buildDirectory
      ? join(config.buildDirectory, '.vite/manifest.json')
      : 'public/assets/.vite/manifest.json',
    ...config,
  }
}
