import { mkdirSync, writeFileSync } from 'node:fs'
import { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { Plugin, ResolvedConfig } from 'vite'
import { PluginFullOptions } from './contracts'
import { resolveDevServerUrl } from './utils'

/**
 * Write the entrypoints.json file in dev and build mode
 */
export const entrypoints = (_options: PluginFullOptions): Plugin => {
  let outDir = ''
  let resolvedConfig: ResolvedConfig
  let devServerUrl = ''

  let entryPointsMap: Record<string, string> = {}

  /**
   * Write the entrypoints.json file
   */
  const writeEntryPointsFile = () => {
    const data = { url: devServerUrl, entrypoints: entryPointsMap }

    mkdirSync(join(outDir, 'assets'), { recursive: true })
    writeFileSync(join(outDir, 'assets/entrypoints.json'), JSON.stringify(data, null, 2))
  }

  return {
    name: 'vite-plugin-adonis:entrypoints',

    /**
     * Write the entrypoints.json file in build mode.
     */
    writeBundle(_, bundle) {
      entryPointsMap = {}

      Object.keys(bundle)
        .filter((fileName) => fileName.match(/__entrypoint_/))
        .forEach((fileName) => {
          const entryPointName = fileName.match(/__entrypoint_(.+)_\d+__/)
          entryPointsMap[entryPointName![0]] = fileName
        })

      writeEntryPointsFile()
    },

    /**
     * Write the entrypoints.json file in dev mode.
     * We are writing the file from this hook because we need
     * to resolve the dev server url that is only exposed
     * at this time.
     */
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        devServerUrl = resolveDevServerUrl(
          server.httpServer?.address() as AddressInfo,
          server.config
        )

        const entryPoints = resolvedConfig.build.rollupOptions.input
        outDir = join(resolvedConfig.root, resolvedConfig.build.outDir)

        for (const [name, entryPoint] of Object.entries(entryPoints || {})) {
          entryPointsMap[name] = `${devServerUrl}/${entryPoint}`
        }

        writeEntryPointsFile()
      })
    },

    /**
     * Store the resolved config to use it later.
     */
    configResolved: async (userConfig) => {
      resolvedConfig = userConfig
    },
  }
}
