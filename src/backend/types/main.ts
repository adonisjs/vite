/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Contents of the hotfile
 */
export type HotFile = {
  url: string
}

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

/**
 * Vite backend integration configuration options
 */
export type ViteOptions = {
  /**
   * Path to the hot file relative from the root of the
   * application.
   *
   * @default public/assets/hot.json
   */
  hotFile: string

  /**
   * Public directory where the assets will be compiled.
   *
   * @default 'public/assets'
   */
  buildDirectory: string

  /**
   * The URL to prefix when generating assets URLs. For example: This
   * could the CDN URL when generating the production build
   *
   * @default ''
   */
  assetsUrl?: string

  /**
   * A custom set of attributes to apply on all
   * script tags
   */
  scriptAttributes?: SetAttributes

  /**
   * A custom set of attributes to apply on all
   * style tags
   */
  styleAttributes?: SetAttributes
}
