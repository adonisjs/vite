import defu from 'defu'
import { AddressInfo } from 'node:net'
import { ConfigEnv, Plugin, UserConfig } from 'vite'
import { PluginFullOptions } from './contracts'
import { addTrailingslash, resolveDevServerUrl } from './utils'

/**
 * Vite config hook
 */
export const configHook = (
  options: PluginFullOptions,
  baseConfig: UserConfig,
  { command }: ConfigEnv
): UserConfig => {
  const entryPoints = Object.entries(options.entryPoints).flatMap(([, files]) => files)

  const config: UserConfig = {
    publicDir: false,

    /**
     * Set the logLevel to get a cleaner output when running
     * the dev server within the same process as Adonis.
     */
    logLevel: 'warn',

    base: command === 'build' ? addTrailingslash(options.publicPath) : '/',

    server: {
      /**
       * Will allow to rewrite the URL to the public path
       * in dev mode
       */
      origin: '__adonis_vite__',
    },

    build: {
      assetsDir: '',

      /**
       * Generate a manifest file at build-time
       */
      manifest: true,

      /**
       * Empty the output directory before building
       */
      emptyOutDir: true,

      /**
       * Set the output directory relative to the "public" directory
       */
      outDir: options.outputPath,

      rollupOptions: {
        /**
         * Here we are setting the entry points for rollup
         */
        input: entryPoints,
      },
    },
  }

  return defu(config, baseConfig)
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
      server.httpServer?.once('listening', () => {
        devServerUrl = resolveDevServerUrl(
          server.httpServer?.address() as AddressInfo,
          server.config
        )
      })
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
  }
}
