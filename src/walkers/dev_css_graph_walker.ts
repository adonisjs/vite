/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import string from '@poppinss/utils/string'
import type { ModuleNode, ViteDevServer } from 'vite'

import type { TagBuilder } from '../tag_builder.ts'
import type { DevAssetUrlBuilder } from '../url_builders/dev_asset_url_builder.ts'
import type { EntrypointWalker, ResolvedEntrypoint, ResolvedTag } from '../types.ts'

/**
 * Walks the Vite dev server's in-memory module graph for the given JS
 * entrypoints and collects every CSS module imported (transitively)
 * along the way. Without this, a full page reload would briefly render
 * unstyled (FOUC) until the JS modules pull the CSS back in.
 *
 * Output order (matches existing dev-mode behavior):
 *   1. Stylesheets discovered from the module graph
 *   2. The Vite HMR client script (`@vite/client`)
 *   3. The entrypoint tags themselves (script for JS entries,
 *      style for CSS entries)
 */
export class DevCssGraphWalker implements EntrypointWalker {
  #devServer: ViteDevServer
  #urlBuilder: DevAssetUrlBuilder
  #tagBuilder: TagBuilder

  constructor(devServer: ViteDevServer, urlBuilder: DevAssetUrlBuilder, tagBuilder: TagBuilder) {
    this.#devServer = devServer
    this.#urlBuilder = urlBuilder
    this.#tagBuilder = tagBuilder
  }

  /**
   * A module is a stylesheet if its URL has a CSS-like extension OR it
   * is a Vue SFC `<style>` block (Vite tags those with `?vue&type=style`
   * on the module id).
   */
  #isStyleModule(mod: ModuleNode) {
    return this.#tagBuilder.isCssPath(mod.url) || (!!mod.id && /\?vue&type=style/.test(mod.id))
  }

  /**
   * Recursively walks the module graph rooted at `mod`, collecting URLs
   * of every style module reachable from it. The `importer` arg lets us
   * skip a style module whose importer is itself a style module — that
   * case is already handled by the parent style and emitting it twice
   * would double-load the CSS.
   */
  #collectCss(
    mod: ModuleNode,
    styleUrls: Set<string>,
    visitedModules: Set<string>,
    importer?: ModuleNode
  ): void {
    if (!mod.url) {
      return
    }

    if (visitedModules.has(mod.url)) {
      return
    }
    visitedModules.add(mod.url)

    if (this.#isStyleModule(mod) && (!importer || !this.#isStyleModule(importer))) {
      if (mod.url.startsWith('/')) {
        styleUrls.add(mod.url)
      } else if (mod.url.startsWith('\0')) {
        // Virtual modules are prefixed with \0; rewrite to Vite's
        // browser-readable `/@id/__x00__…` form.
        styleUrls.add(`/@id/__x00__${mod.url.substring(1)}`)
      } else {
        styleUrls.add(`/@id/${mod.url}`)
      }
    }

    mod.importedModules.forEach((dep) => this.#collectCss(dep, styleUrls, visitedModules, mod))
  }

  async walk(entries: string[]): Promise<ResolvedEntrypoint> {
    const jsEntrypoints = entries.filter((entry) => !this.#tagBuilder.isCssPath(entry))

    /**
     * If the module graph is empty we just booted — nothing has been
     * requested yet, so the graph holds no CSS imports either. Warm
     * the JS entries to populate it before walking.
     */
    if (this.#devServer.moduleGraph.idToModuleMap.size === 0) {
      await Promise.allSettled(
        jsEntrypoints.map((entry) => this.#devServer.warmupRequest(`/${entry}`))
      )
    }

    /**
     * Collect CSS files reachable from each JS entrypoint
     */
    const cssUrls = new Set<string>()
    const visitedModules = new Set<string>()
    for (const entry of jsEntrypoints) {
      const filePath = join(this.#devServer.config.root, entry)
      const entryMod = this.#devServer.moduleGraph.getModuleById(string.toUnixSlash(filePath))
      if (entryMod) {
        this.#collectCss(entryMod, cssUrls, visitedModules)
      }
    }

    /**
     * Build the entrypoint tags themselves. JS entries become script
     * tags, CSS entries become style tags — both honor the user's
     * scriptAttributes / styleAttributes via the TagBuilder downstream.
     */
    const entryTags: ResolvedTag[] = entries.map((entry) => {
      const url = this.#urlBuilder.urlFor(entry)
      return this.#tagBuilder.isCssPath(entry)
        ? { kind: 'style', assetPath: entry, url }
        : { kind: 'script', assetPath: entry, url }
    })

    const discoveredStyleTags: ResolvedTag[] = Array.from(cssUrls).map((href) => ({
      kind: 'discoveredStyle',
      href,
    }))

    /**
     * The original implementation passed every tag through
     * `Array.prototype.sort((tag) => tag is link ? -1 : 1)` — a one-arg
     * (and therefore non-transitive) comparator. V8's TimSort
     * interprets it as "all link tags first, then the rest" but, as a
     * side effect of the contradictory comparator, it also reverses
     * the relative order *within* the link group. Several tests pin
     * that exact order (e.g. transitively-discovered CSS appearing
     * before directly-imported CSS), so we keep the same call here to
     * preserve behavior bit-for-bit.
     */
    const tags: ResolvedTag[] = [...discoveredStyleTags, { kind: 'viteClient' }, ...entryTags]
    tags.sort((tag) => (this.#isLinkTag(tag) ? -1 : 1))

    return { tags, preloads: [] }
  }

  #isLinkTag(tag: ResolvedTag): boolean {
    return tag.kind === 'style' || tag.kind === 'discoveredStyle'
  }
}
