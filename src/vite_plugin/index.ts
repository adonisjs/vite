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
import { config } from './config.js'
import { PluginFullOptions, PluginOptions } from './types/index.js'
import PluginRestart from 'vite-plugin-restart'
import { join } from 'node:path'

const VitePluginRestart = PluginRestart as any as typeof PluginRestart.default

/**
 * Vite plugin for AdonisJS
 */
export default function Adonis(options: PluginOptions): PluginOption[] {
  const hotfileDefaultDestination = join(
    options.publicDirectory || 'public',
    options.buildDirectory || 'assets',
    'hot.json'
  )

  const fullOptions = defu<PluginFullOptions, [Partial<PluginOptions>]>(options, {
    publicDirectory: 'public',
    buildDirectory: 'assets',
    assetsUrl: '',
    hotFile: hotfileDefaultDestination,
    reload: ['./resources/views/**/*.edge'],
  })

  return [VitePluginRestart({ reload: fullOptions.reload }), config(fullOptions)]
}
