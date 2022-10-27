/**
 * Possible plugin options
 */
export type PluginOptions = {
  /**
   * A map of the entry points
   */
  entryPoints: Record<string, string[]>

  /**
   * The directory where the static files are served from.
   * Will also generate an entrypoints.json file in this directory.
   */
  publicPath?: string

  /**
   * Full-reload the browser when a `.edge` file changes.
   */
  reloadOnEdgeChanges?: boolean
}

export type PluginFullOptions = Required<PluginOptions>
