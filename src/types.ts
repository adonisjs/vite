/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ModuleRunner } from 'vite/module-runner'
import type { Manifest, ServerModuleRunnerOptions, ViteDevServer } from 'vite'

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
      toString(): string
    }
  | {
      tag: 'script'
      attributes: Record<string, any>
      children: string[]
      toString(): string
    }

/**
 * Options accepted by the TagBuilder
 */
export type TagBuilderOptions = {
  styleAttributes?: SetAttributes
  scriptAttributes?: SetAttributes
}

/**
 * A single tag the walker has decided to emit, in its final form.
 *
 * `assetPath` is the original (un-hashed) entrypoint name — passed to
 * the user's scriptAttributes/styleAttributes callback as `src`.
 * `url` is the final HTML attribute value: dev-server path in dev mode,
 * hashed manifest output in build mode.
 *
 * `style` honors user-supplied styleAttributes; `discoveredStyle` is a
 * plain `<link rel="stylesheet">` for CSS picked up from the dev server
 * module graph (no user attributes applied — matches existing behavior).
 */
export type ResolvedTag =
  | { kind: 'script'; assetPath: string; url: string; integrity?: string }
  | { kind: 'style'; assetPath: string; url: string; integrity?: string }
  | { kind: 'discoveredStyle'; href: string }
  | { kind: 'viteClient' }

/**
 * Data shape returned by an EntrypointWalker. The renderer iterates
 * `tags` in order, then prepends the preload list (sorted, uniq).
 */
export type ResolvedEntrypoint = {
  tags: ResolvedTag[]
  preloads: { href: string; kind: 'modulepreload' | 'style' }[]
}

/**
 * Resolves an asset path to its final URL. Implementations differ between
 * dev mode (served from the dev server) and build mode (hashed file from
 * the manifest).
 */
export interface AssetUrlBuilder {
  urlFor(asset: string): string
}

/**
 * Walks the source of truth for the active mode (Vite module graph in dev,
 * manifest file in build) and returns the assets associated with the given
 * entrypoints.
 */
export interface EntrypointWalker {
  walk(entries: string[]): ResolvedEntrypoint | Promise<ResolvedEntrypoint>
}

/**
 * Mode-specific behavior bundle plugged into Vite via `vite.useRuntime()`.
 * BuildRuntime + DevRuntime implement this interface; Vite delegates every
 * mode-aware public method to the active runtime.
 */
export interface ViteRuntime {
  resolveEntrypointTags(
    entries: string[],
    attributes?: Record<string, any>
  ): Promise<AdonisViteElement[]>
  resolveAssetUrl(asset: string): string
  hmrScript(attributes?: Record<string, any>): AdonisViteElement | null
  manifest(): Manifest
  devServer(): ViteDevServer | undefined
  createModuleRunner(options?: ServerModuleRunnerOptions): Promise<ModuleRunner>
  stop(): Promise<void>
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
