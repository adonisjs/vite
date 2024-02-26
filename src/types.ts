/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Parameters passed to the setAttributes callback
 */
export type SetAttributesCallbackParams = {
  src: string
  url: string
}

/**
 * Attributes to be set on the script/style tags.
 * Can be either a record or a callback that returns a record.
 */
export type SetAttributes =
  | Record<string, string | boolean>
  | ((params: SetAttributesCallbackParams) => Record<string, string | boolean>)

/**
 * Representation of an AdonisJS Vite Element returned
 * by different tags generation APIs
 */
export type AdonisViteElement =
  | {
      tag: 'link'
      attributes: Record<string, any>
    }
  | {
      tag: 'script'
      attributes: Record<string, any>
      children: string[]
    }

export interface ViteOptions {
  /**
   * Public directory where the assets will be compiled.
   *
   * @default 'public/assets'
   */
  buildDirectory: string

  /**
   * Path to the manifest file relative from the root of
   * the application
   *
   * @default 'public/assets/.vite/manifest.json'
   */
  manifestFile: string

  /**
   * The URL to prefix when generating assets URLs. For example: This
   * could the CDN URL when generating the production build
   *
   * @default ''
   */
  assetsUrl?: string

  /**
   * A custom set of attributes to apply on all
   * script tags injected by edge `@vite` tag
   */
  styleAttributes?: SetAttributes

  /**
   * A custom set of attributes to apply on all
   * style tags injected by edge `@vite` tag
   */
  scriptAttributes?: SetAttributes
}
