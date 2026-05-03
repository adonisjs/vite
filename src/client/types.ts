/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

export interface PluginOptions {
  /**
   * The URL where the assets will be served. This is particularly
   * useful if you are using a CDN to deploy your assets.
   *
   * @default ''
   */
  assetsUrl?: string

  /**
   * Files that should trigger a page reload when changed.
   *
   * @default ['./resources/views/** /*.edge']
   */
  reload?: string[]

  /**
   * Paths to the entrypoints files
   */
  entrypoints: string[]

  /**
   * Public directory where the assets will be compiled.
   *
   * @default 'public/assets'
   */
  buildDirectory?: string

  /**
   * Additional files to include in the build that are not imported by the
   * entrypoints.
   *
   * - When passed as a `string[]`, every entry is treated as a chunk: glob
   *   patterns are expanded and each matching file is emitted via Vite's
   *   `emitFile({ type: 'chunk' })`.
   * - When passed as `{ chunks?, assets? }`, `chunks` behaves identically
   *   to the array form, while `assets` files are emitted as raw assets
   *   (no glob support, exact paths only) and the manifest is rewritten so
   *   the manifest key matches the source path.
   */
  assets?: string[] | { chunks?: string[]; assets?: string[] }
}

export type PluginFullOptions = Required<Omit<PluginOptions, 'assets'>>
