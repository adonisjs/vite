/**
 * Possible plugin options
 */
export type PluginOptions = {
  entryPoints: Record<string, string[]>
  reloadOnEdgeChanges?: boolean
}

export type PluginFullOptions = Required<PluginOptions>
