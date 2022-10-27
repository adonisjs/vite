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
   *
   * @default '/assets'
   */
  publicPath?: string

  /**
   * Full-reload the browser when a `.edge` file changes.
   *
   * @default true
   */
  reloadOnEdgeChanges?: boolean

  /**
   * The output path for writing the compiled files. Should always
   * be inside the public directory, so that AdonisJS can serve it
   *
   * @default 'public/assets'
   */
  outputPath?: string
}

export type PluginFullOptions = Required<PluginOptions>
