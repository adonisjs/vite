import defu from 'defu'
import { normalizePath, PluginOption } from 'vite'
import { config } from './config'
import { PluginFullOptions, PluginOptions } from './contracts'
import { entrypoints } from './entrypoints'
import { reload } from './reload'

const normalizeEntrypointsPaths = (options: PluginOptions) => {
  for (const [key, files] of Object.entries(options.entryPoints)) {
    options.entryPoints[key] = files.map((file) => normalizePath(file))
  }
}
/**
 * Vite plugin for AdonisJS
 */
export default function Adonis(options: PluginOptions): PluginOption[] {
  const fullOptions = defu<PluginFullOptions, [Partial<PluginOptions>]>(options, {
    publicPath: '/assets',
    outputPath: 'public/assets',
    reloadOnEdgeChanges: true,
  })

  normalizeEntrypointsPaths(fullOptions)

  return [reload(fullOptions), config(fullOptions), entrypoints(fullOptions)]
}
