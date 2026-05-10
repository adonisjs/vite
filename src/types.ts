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

/**
 * Augmentable map for typing entries passed to `vite.loadServerModule`.
 * Apps and packages merge into this interface to associate entrypoint
 * paths with the shape of their default exports.
 *
 * @example
 * declare module '@adonisjs/vite/types' {
 *   interface ServerModuleMap {
 *     'inertia/app/ssr.ts': typeof import('../inertia/app/ssr.ts')
 *   }
 * }
 */
export interface ServerModuleMap {}

/**
 * Options accepted by `vite.loadServerModule`.
 */
export interface LoadServerModuleOptions {
  /**
   * Clear the module runner cache before importing in dev mode.
   *
   * Defaults to `false` — Vite's HMR pushes invalidations into the
   * runner, so cached modules are already kept fresh on file change.
   * Set to `true` only when the entrypoint registers top-level state
   * that must be reset on every load.
   *
   * Has no effect in production (bundled imports are always cached).
   *
   * @default false
   */
  fresh?: boolean
}
