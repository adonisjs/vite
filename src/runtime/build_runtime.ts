/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Manifest, ServerModuleRunnerOptions, ViteDevServer } from 'vite'
import type { ModuleRunner } from 'vite/module-runner'

import { TagBuilder } from '../tag_builder.ts'
import { ManifestLoader } from '../manifest_loader.ts'
import { EntrypointTagRenderer } from '../entrypoint_renderer.ts'
import { ManifestChunkWalker } from '../walkers/manifest_chunk_walker.ts'
import type { AdonisViteElement, ViteOptions, ViteRuntime } from '../types.ts'
import { BuildAssetUrlBuilder } from '../url_builders/build_asset_url_builder.ts'

/**
 * Runtime used after `vite build` has produced a manifest. All asset
 * URLs are resolved through the manifest, no dev server is involved.
 *
 * Methods that only make sense in dev mode (`devServer`,
 * `createModuleRunner`, `hmrScript`) return null/undefined or throw.
 */
export class BuildRuntime implements ViteRuntime {
  #manifestLoader: ManifestLoader
  #urlBuilder: BuildAssetUrlBuilder
  #renderer: EntrypointTagRenderer

  constructor(options: ViteOptions) {
    const tagBuilder = new TagBuilder({
      styleAttributes: options.styleAttributes,
      scriptAttributes: options.scriptAttributes,
    })
    this.#manifestLoader = new ManifestLoader(options.manifestFile)
    this.#urlBuilder = new BuildAssetUrlBuilder(options.assetsUrl ?? '', this.#manifestLoader)
    this.#renderer = new EntrypointTagRenderer(
      new ManifestChunkWalker(this.#manifestLoader, this.#urlBuilder, tagBuilder),
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

  hmrScript(): AdonisViteElement | null {
    return null
  }

  manifest(): Manifest {
    return this.#manifestLoader.load()
  }

  devServer(): ViteDevServer | undefined {
    return undefined
  }

  async createModuleRunner(_options?: ServerModuleRunnerOptions): Promise<ModuleRunner> {
    throw new Error('Cannot create a module runner without a Vite dev server')
  }

  async stop(): Promise<void> {}
}
