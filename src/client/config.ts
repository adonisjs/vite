/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import type { ConfigEnv, Plugin, UserConfig } from 'vite'

import { addTrailingSlash } from '../utils.ts'
import type { PluginFullOptions } from './types.ts'

/**
 * Resolves the base URL for Vite configuration based on command and options
 * 
 * @param config - User-provided Vite configuration
 * @param options - Plugin options containing assetsUrl
 * @param command - Vite command being executed ('build' or 'serve')
 * 
 * @example
 * const base = resolveBase(userConfig, { assetsUrl: '/assets' }, 'build')
 * // Returns: '/assets/' for build, '/' for serve
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
 * Merges user Vite configuration with AdonisJS-specific defaults and requirements
 * 
 * @param options - Plugin options containing build directory and entry points
 * @param userConfig - User-provided Vite configuration
 * @param command - Vite environment command
 * 
 * @example
 * const mergedConfig = configHook(pluginOptions, userViteConfig, { command: 'build' })
 */
export function configHook(
  options: PluginFullOptions,
  userConfig: UserConfig,
  { command }: ConfigEnv
): UserConfig {
  const config: UserConfig = {
    publicDir: userConfig.publicDir ?? false,
    base: resolveBase(userConfig, options, command),

    /**
     * Disable the vite dev server cors handling. Otherwise, it will
     * override the cors settings defined by @adonisjs/cors
     * https://github.com/adonisjs/vite/issues/13
     */
    server: { cors: userConfig.server?.cors ?? false },

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
