/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { defu } from 'defu'
import { PluginOption } from 'vite'
import PluginRestart from 'vite-plugin-restart'

import { config } from './config.js'
import type { PluginFullOptions, PluginOptions } from './types.js'

const VitePluginRestart = PluginRestart as any as typeof PluginRestart.default

declare module 'vite' {
  interface ManifestChunk {
    integrity: string
  }
}

/**
 * Vite plugin for adonisjs
 */
export default function adonisjs(options: PluginOptions): PluginOption[] {
  const fullOptions = defu<PluginFullOptions, [Partial<PluginOptions>]>(options, {
    buildDirectory: 'public/assets',
    assetsUrl: '/assets',
    hotFile: 'public/assets/hot.json',
    reload: ['./resources/views/**/*.edge'],
  })

  return [VitePluginRestart({ reload: fullOptions.reload }), config(fullOptions)]
}
