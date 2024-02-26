/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference types="@vavite/multibuild" />

import { PluginOption } from 'vite'
import PluginRestart from 'vite-plugin-restart'

import { config } from './config.js'
import type { PluginOptions } from './types.js'

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
    },
    options
  )

  return [PluginRestart({ reload: fullOptions.reload }), config(fullOptions)]
}
