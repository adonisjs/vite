import defu from 'defu'
import { ConfigEnv, Plugin, UserConfig } from 'vite'
import { PluginFullOptions } from './contracts'

/**
 * Vite config hook
 */
export const configHook = (
  options: PluginFullOptions,
  baseConfig: UserConfig,
  _env: ConfigEnv
): UserConfig => {
  const entryPoints = Object.entries(options.entryPoints).flatMap(([, files]) => files)

  const config: UserConfig = {
    publicDir: false,

    /**
     * Set the logLevel to get a cleaner output when running
     * the dev server within the same process as Adonis.
     */
    logLevel: 'warn',

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
export const config = (options: PluginFullOptions): Plugin => ({
  name: 'vite-plugin-adonis:config',
  config: configHook.bind(null, options),
})
