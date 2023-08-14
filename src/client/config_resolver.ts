/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ResolvedConfig, UserConfig, AliasOptions } from 'vite'

import { addTrailingSlash } from './utils.js'
import { PluginFullOptions } from './types.js'

export class ConfigResolver {
  static resolvedConfig?: ResolvedConfig

  /**
   * Resolve the `config.base` value
   */
  static resolveBase(
    config: UserConfig,
    options: PluginFullOptions,
    command: 'build' | 'serve'
  ): string {
    if (config.base) {
      return config.base
    }

    if (command === 'build') {
      return addTrailingSlash(options.assetsUrl) + addTrailingSlash(options.buildDirectory)
    }

    return '/'
  }

  /**
   * Resolve the `config.resolve.alias` value
   *
   * Basically we are merging the user defined alias with the
   * default alias.
   */
  static resolveAlias(config: UserConfig): AliasOptions {
    const defaultAlias = { '@/': `/resources/js/` }

    if (Array.isArray(config.resolve?.alias)) {
      return [
        ...(config.resolve?.alias ?? []),
        Object.entries(defaultAlias).map(([find, replacement]) => ({ find, replacement })),
      ]
    }

    return { ...defaultAlias, ...config.resolve?.alias }
  }

  /**
   * Resolve the `config.build.outDir` value
   */
  static resolveOutDir(config: UserConfig, options: PluginFullOptions): string {
    return config.build?.outDir ?? options.buildDirectory
  }
}
