/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Possible plugin options
 */
export type PluginOptions = {
  /**
   * Path to the hot file
   *
   * @default public/hot.json
   */
  hotFile?: string

  /**
   * Paths to the entrypoints files
   */
  entrypoints: string[]

  /**
   * Path to your AdonisJS public directory
   *
   * @default 'public'
   */
  publicDirectory?: string

  /**
   * The URL where the assets will be served. This is particularly
   * useful if you are using a CDN to deploy your assets.
   *
   * @default ''
   */
  assetsUrl?: string

  /**
   * Public subdirectory where the assets will be compiled.
   *
   * @default 'assets'
   */
  buildDirectory?: string

  /**
   * Files that should trigger a page reload when changed.
   *
   * @default ['./resources/views/** /*.edge']
   */
  reload?: string[]
}

export type PluginFullOptions = Required<PluginOptions>
