/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { defu } from 'defu'
import { AddressInfo } from 'node:net'
import { ConfigEnv, Plugin, UserConfig } from 'vite'
import { PluginFullOptions } from './types/index.js'
import { resolveDevServerUrl } from './utils.js'
import { HotFile } from './hot_file.js'
import { ConfigResolver } from './config_resolver.js'
import { join } from 'node:path'

/**
 * Vite config hook
 */
export const configHook = (
  options: PluginFullOptions,
  userConfig: UserConfig,
  { command }: ConfigEnv
): UserConfig => {
  const config: UserConfig = {
    publicDir: userConfig.publicDir ?? false,
    base: ConfigResolver.resolveBase(userConfig, options, command),
    resolve: { alias: ConfigResolver.resolveAlias(userConfig) },

    server: {
      /**
       * Will allow to rewrite the URL to the public path
       * in dev mode
       */
      origin: '__adonis_vite__',
    },

    build: {
      assetsDir: '',
      manifest: userConfig.build?.manifest ?? true,
      emptyOutDir: true,
      outDir: ConfigResolver.resolveOutDir(userConfig, options),

      rollupOptions: {
        input: options.entrypoints.map((entrypoint) => join(userConfig.root || '', entrypoint)),
      },
    },
  }

  return defu(config, userConfig)
}

/**
 * Update the user vite config to match the Adonis requirements
 */
export const config = (options: PluginFullOptions): Plugin => {
  let devServerUrl: string

  return {
    name: 'vite-plugin-adonis:config',
    config: configHook.bind(null, options),

    /**
     * Store the dev server url for further usage when rewriting URLs
     */
    configureServer(server) {
      const hotfile = new HotFile(options.hotFile)

      server.httpServer?.once('listening', async () => {
        devServerUrl = resolveDevServerUrl(
          server.httpServer!.address() as AddressInfo,
          server.config
        )

        await hotfile.write({ url: devServerUrl })
      })

      server.httpServer?.on('close', () => hotfile.clean())
    },

    /**
     * Rewrite URL to the public path in dev mode
     *
     * See : https://nystudio107.com/blog/using-vite-js-next-generation-frontend-tooling-with-craft-cms#vite-processed-assets
     */
    transform: (code) => ({
      code: code.replace(/__adonis_vite__/g, devServerUrl),
      map: null,
    }),

    configResolved: async (resolvedConfig) => {
      ConfigResolver.resolvedConfig = resolvedConfig
    },
  }
}
