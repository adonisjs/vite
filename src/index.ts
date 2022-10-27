import defu from 'defu'
import { PluginOption } from 'vite'
import { config } from './config'
import { PluginFullOptions, PluginOptions } from './contracts'
import { entrypoints } from './entrypoints'
import { reload } from './reload'

/**
 * Vite plugin for AdonisJS
 */
export default function Adonis(options: PluginOptions): PluginOption[] {
  const fullOptions = defu<PluginFullOptions, [Partial<PluginOptions>]>(options, {
    publicPath: '/assets',
    reloadOnEdgeChanges: true,
  })

  return [reload(fullOptions), config(fullOptions), entrypoints(fullOptions)]
}
