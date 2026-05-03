/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { uniqBy } from './utils.ts'
import type { TagBuilder } from './tag_builder.ts'
import type {
  AdonisViteElement,
  EntrypointWalker,
  ResolvedEntrypoint,
  ResolvedTag,
} from './types.ts'

/**
 * Composes an EntrypointWalker with a TagBuilder to turn a list of
 * entrypoint paths into the final list of HTML elements that get
 * injected by the `@vite` Edge tag.
 *
 * Mode-specific work (which graph to walk, how to resolve URLs) lives
 * in the walker. This class is the same instance in both dev and build
 * mode — it just iterates the data and renders.
 */
export class EntrypointTagRenderer {
  #walker: EntrypointWalker
  #tagBuilder: TagBuilder

  constructor(walker: EntrypointWalker, tagBuilder: TagBuilder) {
    this.#walker = walker
    this.#tagBuilder = tagBuilder
  }

  async render(entries: string[], attributes?: Record<string, any>): Promise<AdonisViteElement[]> {
    const resolved = await this.#walker.walk(entries)
    return [
      ...this.#renderPreloads(resolved.preloads),
      ...resolved.tags.map((tag) => this.#renderTag(tag, attributes)),
    ]
  }

  /**
   * Preloads are de-duplicated by href and sorted so style preloads
   * land before module preloads (CSS should start downloading first).
   */
  #renderPreloads(preloads: ResolvedEntrypoint['preloads']): AdonisViteElement[] {
    return uniqBy(preloads, 'href')
      .sort((preload) => (preload.kind === 'style' ? -1 : 1))
      .map((preload) => this.#tagBuilder.preloadTag(preload.href))
  }

  #renderTag(tag: ResolvedTag, attributes?: Record<string, any>): AdonisViteElement {
    switch (tag.kind) {
      case 'script':
        return this.#tagBuilder.scriptTag(tag.assetPath, tag.url, {
          ...attributes,
          integrity: tag.integrity,
        })
      case 'style':
        return this.#tagBuilder.styleTag(tag.assetPath, tag.url, {
          ...attributes,
          integrity: tag.integrity,
        })
      case 'discoveredStyle':
        return this.#tagBuilder.element({
          tag: 'link',
          attributes: { rel: 'stylesheet', href: tag.href },
        })
      case 'viteClient':
        return this.#tagBuilder.viteClientScript(attributes)
    }
  }
}
