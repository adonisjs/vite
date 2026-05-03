/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ModuleRunner } from 'vite/module-runner'
import type { InlineConfig, Manifest, ServerModuleRunnerOptions, ViteDevServer } from 'vite'

import { TagBuilder } from '../tag_builder.ts'
import { EntrypointTagRenderer } from '../entrypoint_renderer.ts'
import { DevCssGraphWalker } from '../walkers/dev_css_graph_walker.ts'
import { DevAssetUrlBuilder } from '../url_builders/dev_asset_url_builder.ts'
import type { AdonisViteElement, ViteOptions, ViteRuntime } from '../types.ts'

/**
 * Runtime active when AdonisJS is running with the Vite dev server
 * attached. All asset resolution flows through the in-process dev
 * server (module graph + middleware).
 *
 * Build the runtime via `DevRuntime.create(...)` — it dynamically
 * imports `vite`, boots the dev server, and returns a ready-to-use
 * runtime that can be plugged into Vite via `vite.useRuntime(runtime)`.
 */
export class DevRuntime implements ViteRuntime {
  #devServer: ViteDevServer
  #urlBuilder: DevAssetUrlBuilder
  #tagBuilder: TagBuilder
  #renderer: EntrypointTagRenderer

  /**
   * Boots a Vite dev server and wraps it in a DevRuntime. Vite is
   * imported lazily so production processes never load it.
   *
   * @param viteOptions - The AdonisJS Vite options (used to derive the
   *   TagBuilder configuration: styleAttributes, scriptAttributes).
   * @param inlineConfig - Optional Vite InlineConfig forwarded to
   *   `createServer` (root, plugins, server overrides, …).
   */
  static async create(
    viteOptions: ViteOptions,
    inlineConfig: InlineConfig = {}
  ): Promise<DevRuntime> {
    const { createServer } = await import('vite')
    const hmrPort = Number(process.env.VITE_HMR_PORT)

    const devServer = await createServer({
      server: {
        middlewareMode: true,
        ...(hmrPort && !Number.isNaN(hmrPort) ? { hmr: { port: hmrPort } } : {}),
      },
      appType: 'custom',
      ...inlineConfig,
    })

    const tagBuilder = new TagBuilder({
      styleAttributes: viteOptions.styleAttributes,
      scriptAttributes: viteOptions.scriptAttributes,
    })

    return new DevRuntime(devServer, tagBuilder)
  }

  constructor(devServer: ViteDevServer, tagBuilder: TagBuilder) {
    this.#devServer = devServer
    this.#tagBuilder = tagBuilder
    this.#urlBuilder = new DevAssetUrlBuilder()
    this.#renderer = new EntrypointTagRenderer(
      new DevCssGraphWalker(devServer, this.#urlBuilder, tagBuilder),
      tagBuilder
    )
  }

  resolveEntrypointTags(
    entries: string[],
    attributes?: Record<string, any>
  ): Promise<AdonisViteElement[]> {
    return this.#renderer.render(entries, attributes)
  }

  resolveAssetUrl(asset: string): string {
    return this.#urlBuilder.urlFor(asset)
  }

  /**
   * The React Refresh boot snippet — required as the first script on
   * the page when using `@vitejs/plugin-react`. Returned only in dev
   * mode; the BuildRuntime returns null.
   */
  hmrScript(attributes?: Record<string, any>): AdonisViteElement {
    return this.#tagBuilder.element({
      tag: 'script',
      attributes: { type: 'module', ...attributes },
      children: [
        '',
        `import RefreshRuntime from '/@react-refresh'`,
        `RefreshRuntime.injectIntoGlobalHook(window)`,
        `window.$RefreshReg$ = () => {}`,
        `window.$RefreshSig$ = () => (type) => type`,
        `window.__vite_plugin_react_preamble_installed__ = true`,
        '',
      ],
    })
  }

  manifest(): Manifest {
    throw new Error('Cannot read the manifest file when running in dev mode')
  }

  devServer(): ViteDevServer {
    return this.#devServer
  }

  async createModuleRunner(options: ServerModuleRunnerOptions = {}): Promise<ModuleRunner> {
    const { createServerModuleRunner } = await import('vite')
    return createServerModuleRunner(this.#devServer.environments.ssr, options)
  }

  async stop(): Promise<void> {
    await this.#devServer.close()
  }
}
