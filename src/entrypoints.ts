import { AddressInfo } from 'node:net'
import { join } from 'node:path'
import { Plugin, ResolvedConfig } from 'vite'
import { PluginFullOptions } from './contracts'
import { resolveDevServerUrl } from './utils'
import { EntryPointFile } from './entry_point_file'
import { readFileSync } from 'node:fs'

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
     * Write the entrypoints.json file in build mode
     *
     * We just parse the manifest and create the entrypoints.json file based
     * on it
     */
    writeBundle() {
      const manifestPath = join(resolvedConfig.root, options.outputPath, 'manifest.json')
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, any>

      const entryFile = new EntryPointFile(options.publicPath)
      for (const chunk of Object.values(manifest)) {
        // Let's check if this file is defined as an entry point from the user config
        const matchingEntrypointFile = Object.entries(options.entryPoints).filter(([_, files]) => {
          return files.some((filename) => filename.endsWith(chunk.src))
        })

        if (!matchingEntrypointFile) continue

        // If it is, we add it to entrypoints.json, with the hashed file
        // name so the server will be able to serve it.
        for (const [name] of matchingEntrypointFile) {
          entryFile.addFilesToEntryPoint(name, [chunk.file])
        }
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
