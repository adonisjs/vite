import defu from 'defu'
import { ConfigEnv, Plugin, UserConfig } from 'vite'
import { PluginFullOptions, PluginOptions } from './contracts'

/**
 * Convert the input entry points to a compatible rollup format
 *
 * Given the following entry points :
 * - app: [ 'app.ts', 'app.css' ]
 *
 * We will produces the following output for rollup `input` property:
 * {
 *  '__entrypoint:app:0__': 'app.ts',
 * ' __entrypoint:app:1__': 'app.css'
 * }
 *
 */
export const buildEntryPoints = (entryPoints: Record<string, string[]>) => {
  return Object.entries(entryPoints).reduce((acc, [name, files]) => {
    files.forEach((file, index) => {
      const entryName = `__entrypoint_${name}_${index}__`
      acc[entryName] = file
    })

    return acc
  }, {} as Record<string, string>)
}

/**
 * Vite config hook
 */
export const configHook = (
  options: PluginOptions,
  baseConfig: UserConfig,
  _env: ConfigEnv
): UserConfig => {
  const entryPoints = buildEntryPoints(options.entryPoints)
  const config: UserConfig = {
    publicDir: false,
    build: {
      manifest: true,
      emptyOutDir: true,
      outDir: 'public',
      rollupOptions: {
        input: entryPoints,
        output: {
          /**
           * Rewrite the output file name to match the entry point name
           */
          assetFileNames: (info) => {
            const defaultName = 'assets/[name].[hash][extname]'
            if (!info.name) {
              return defaultName
            }

            const entryPoint = Object.entries(entryPoints).find(([_, files]) =>
              files.includes(info.name!)
            )

            if (entryPoint) {
              return `assets/${entryPoint[0]}.[hash][extname]`
            }

            return defaultName
          },
        },
      },
    },
  }

  return defu(config, baseConfig)
}

/**
 * Update the user vite config to match the Adonis requirements
 */
export const config = (options: PluginFullOptions): Plugin => {
  return {
    name: 'vite-plugin-adonis:config',
    config: (baseConfig, env) => {
      return configHook(options, baseConfig, env)
    },
  }
}
