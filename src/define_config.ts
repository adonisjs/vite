/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import type { ViteOptions } from './types.ts'

/**
 * Creates a complete Vite configuration by merging provided options with sensible defaults
 *
 * @param config - Partial Vite configuration options to override defaults
 *
 * @example
 * const viteConfig = defineConfig({
 *   assetsUrl: '/static',
 *   buildDirectory: 'dist'
 * })
 */
export function defineConfig(config: Partial<ViteOptions>): ViteOptions {
  const buildDirectory = config.buildDirectory ?? 'public/assets'

  return {
    assetsUrl: '/assets',
    buildDirectory,
    manifestFile: join(buildDirectory, '.vite/manifest.json'),
    serverBuildDirectory: join(buildDirectory, 'server'),
    ...config,
  }
}
