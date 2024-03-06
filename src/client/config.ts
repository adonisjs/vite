/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import type { AliasOptions, ConfigEnv, Plugin, UserConfig } from 'vite'

import { addTrailingSlash } from '../utils.js'
import type { PluginFullOptions } from './types.js'

/**
 * Resolve the `config.resolve.alias` value
 *
 * Basically we are merging the user defined alias with the
 * default alias.
 */
export function resolveAlias(config: UserConfig): AliasOptions {
  const defaultAlias = { '@/': `/resources/js/` }

  if (Array.isArray(config.resolve?.alias)) {
    return [
      ...(config.resolve?.alias ?? []),
      ...Object.entries(defaultAlias).map(([find, replacement]) => ({ find, replacement })),
    ]
  }

  return { ...defaultAlias, ...config.resolve?.alias }
}

/**
 * Resolve the `config.base` value
 */
export function resolveBase(
  config: UserConfig,
  options: PluginFullOptions,
  command: 'build' | 'serve'
): string {
  if (config.base) return config.base
  if (command === 'build') {
    return addTrailingSlash(options.assetsUrl)
  }

  return '/'
}

/**
 * Vite config hook
 */
export function configHook(
  options: PluginFullOptions,
  userConfig: UserConfig,
  { command }: ConfigEnv
): UserConfig {
  const config: UserConfig = {
    publicDir: userConfig.publicDir ?? false,
    resolve: { alias: resolveAlias(userConfig) },
    base: resolveBase(userConfig, options, command),

    build: {
      assetsDir: '',
      emptyOutDir: true,
      manifest: userConfig.build?.manifest ?? true,
      outDir: userConfig.build?.outDir ?? options.buildDirectory,
      assetsInlineLimit: userConfig.build?.assetsInlineLimit ?? 0,

      rollupOptions: {
        input: options.entrypoints.map((entrypoint) => join(userConfig.root || '', entrypoint)),
      },
    },
  }

  return config
}

/**
 * Update the user vite config to match the Adonis requirements
 */
export const config = (options: PluginFullOptions): Plugin => {
  return {
    name: 'vite-plugin-adonis:config',
    enforce: 'post',
    config: configHook.bind(null, options),
  }
}
