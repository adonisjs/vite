/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ModuleRunner } from 'vite/module-runner'
import type { Manifest, InlineConfig, ViteDevServer, ServerModuleRunnerOptions } from 'vite'

import { ManifestLoader } from './manifest_loader.ts'
import { DevRuntime } from './runtime/dev_runtime.ts'
import { BuildRuntime } from './runtime/build_runtime.ts'
import type { AdonisViteElement, ViteOptions, ViteRuntime } from './types.ts'

/**
 * Vite is the public entry point used by the AdonisJS app, the Edge
 * `@vite` tag, and any user code that needs to resolve asset URLs or
 * generate the entrypoint tags.
 *
 * Internally it is a thin facade. All mode-specific behavior lives in
 * a swappable `ViteRuntime`:
 *
 *   - `BuildRuntime` is installed at construction (default)
 *   - `DevRuntime` is installed by the provider via `vite.useRuntime()`
 *     after booting the dev server
 *
 * Every mode-aware public method delegates to the active runtime.
 */
export class Vite {
  #options: ViteOptions
  #runtime: ViteRuntime

  /**
   * Indicates whether the Vite manifest file exists on disk
   */
  hasManifestFile: boolean

  get useDevServer() {
    return !!this.#runtime.devServer()
  }

  constructor(options: ViteOptions) {
    this.#options = options
    this.#options.assetsUrl = (this.#options.assetsUrl || '/').replace(/\/$/, '')
    this.hasManifestFile = new ManifestLoader(this.#options.manifestFile).hasFile()
    this.#runtime = new BuildRuntime(this.#options)
  }

  /**
   * Swaps the active runtime. Called by the provider in dev mode after
   * booting a Vite dev server (see `DevRuntime.create`). Exposed
   * publicly so power users / tests can install custom runtimes.
   */
  useRuntime(runtime: ViteRuntime) {
    this.#runtime = runtime
  }

  /**
   * Generate HTML tags (script and link) for the specified entry points
   *
   * In development mode, includes HMR script and dynamically discovers CSS files.
   * In production mode, uses the manifest file to generate optimized tags with preloading.
   *
   * @param entryPoints - Single entry point or array of entry points to generate tags for
   * @param attributes - Additional HTML attributes to apply to the generated tags
   *
   * @example
   * // Generate tags for a single entry point
   * const tags = await vite.generateEntryPointsTags('app.js')
   *
   * @example
   * // Generate tags for multiple entry points with custom attributes
   * const tags = await vite.generateEntryPointsTags(
   *   ['app.js', 'admin.js'],
   *   { defer: true }
   * )
   */
  generateEntryPointsTags(
    entryPoints: string[] | string,
    attributes?: Record<string, any>
  ): Promise<AdonisViteElement[]> {
    const entries = Array.isArray(entryPoints) ? entryPoints : [entryPoints]
    return this.#runtime.resolveEntrypointTags(entries, attributes)
  }

  /**
   * Returns the base URL for serving static assets
   */
  assetsUrl() {
    return this.#options.assetsUrl
  }

  /**
   * Returns the full URL path to a specific asset file
   */
  assetPath(asset: string): string {
    return this.#runtime.resolveAssetUrl(asset)
  }

  /**
   * Returns the parsed Vite manifest file contents
   *
   * @throws Will throw an exception when running in development mode
   */
  manifest(): Manifest {
    return this.#runtime.manifest()
  }

  /**
   * Backward-compatible wrapper around the new runtime seam. Prefer
   * having the provider build a `DevRuntime` and call `useRuntime()`
   * directly; this method exists so external callers that still call
   * `vite.createDevServer()` keep working.
   */
  async createDevServer(options?: InlineConfig) {
    const runtime = await DevRuntime.create(this.#options, options)
    this.useRuntime(runtime)
  }

  /**
   * Creates a server-side module runner for executing modules in Node.js context
   */
  createModuleRunner(options: ServerModuleRunnerOptions = {}): Promise<ModuleRunner> {
    return this.#runtime.createModuleRunner(options)
  }

  /**
   * Gracefully stops the Vite development server
   */
  async stopDevServer() {
    await this.#runtime.stop()
  }

  /**
   * Returns the Vite development server instance
   */
  getDevServer(): ViteDevServer | undefined {
    return this.#runtime.devServer()
  }

  /**
   * Generates the React Hot Module Replacement (HMR) script for development.
   * Returns null when no dev server is running.
   */
  getReactHmrScript(attributes?: Record<string, any>): AdonisViteElement | null {
    return this.#runtime.hmrScript(attributes)
  }
}
