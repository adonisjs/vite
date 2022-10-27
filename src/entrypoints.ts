import { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { Plugin, ResolvedConfig } from 'vite'
import { PluginFullOptions } from './contracts'
import { getChunkName, resolveDevServerUrl } from './utils'
import type { OutputChunk } from 'rollup'
import { EntryPointFile } from './entry_point_file'

/**
 * Write the entrypoints.json file in dev and build mode
 *
 * In dev mode, we need to prefix the file names with the dev server URL
 * In build mode, we need to write hashed file names to the entrypoints.json file
 */
export const entrypoints = (options: PluginFullOptions): Plugin => {
  let resolvedConfig: ResolvedConfig
  let fileDest: string

  return {
    name: 'vite-plugin-adonis:entrypoints',

    /**
     * Write the entrypoints.json file in build mode.
     */
    generateBundle({ format }, bundle) {
      const entryFile = new EntryPointFile(options.publicPath)

      for (const file of Object.values(bundle)) {
        if (file.type !== 'chunk') return

        // From the OutputChunk file, we get the original file name, not hashed
        const name = getChunkName(format, file as OutputChunk, resolvedConfig)

        console.log(name)

        // Let's check if this file is defined as an entry point from the user config
        const matchingEntrypointFile = Object.entries(options.entryPoints).find(([_, files]) => {
          return files.includes(name)
        })

        if (!matchingEntrypointFile) continue

        // If it is, we add it to the entrypoints.json file, with the hashed file
        // name so the server will be able to serve it.
        const filePath = [options.publicPath, file.fileName].join('/')
        entryFile.addFilesToEntryPoint(matchingEntrypointFile[0], [filePath])
      }

      entryFile.writeToDisk(fileDest)
    },

    /**
     * Write the entrypoints.json file in dev mode.
     *
     * We are writing the file from this hook because we need
     * to resolve the dev server url that is only exposed
     * at this time.
     *
     * The files paths in the entrypoints.json file will be
     * prefixed with the dev server url.
     */
    configureServer(server) {
      server.httpServer?.once('listening', () => {
        const devServerUrl = resolveDevServerUrl(
          server.httpServer?.address() as AddressInfo,
          server.config
        )

        EntryPointFile.fromPluginInput(options.entryPoints, devServerUrl).writeToDisk(fileDest)
      })
    },

    /**
     * Store the resolved config to in other hooks.
     */
    configResolved: async (userConfig) => {
      resolvedConfig = userConfig
      fileDest = join(resolvedConfig.root, resolvedConfig.build.outDir, 'entrypoints.json')
    },
  }
}
