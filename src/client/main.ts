/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { type PluginOption } from 'vite'

import { config } from './config.ts'
import { reload } from './reload.ts'
import { resolveAssets } from './resolve_assets.ts'
import type { PluginOptions } from './types.ts'

declare module 'vite' {
  interface ManifestChunk {
    integrity: string
  }
}

/**
 * Vite plugin for AdonisJS
 */
export default function adonisjs(options: PluginOptions): PluginOption[] {
  const fullOptions = Object.assign(
    {
      assetsUrl: '/assets',
      buildDirectory: 'public/assets',
      reload: ['./resources/views/**/*.edge'],
      serverEntryPoints: [] as string[],
    },
    options
  )

  return [reload(fullOptions.reload), ...resolveAssets(options.assets), config(fullOptions)]
}
