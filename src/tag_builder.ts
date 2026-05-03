/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { makeAttributes } from './utils.ts'
import type { AdonisViteElement, SetAttributes, TagBuilderOptions } from './types.ts'

const STYLE_FILE_REGEX = /\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\?)/

/**
 * Pure HTML element factory for the tags Vite needs to inject
 * (script, link, modulepreload, vite client). Unaware of dev vs
 * build mode — receives finalized URLs and renders them.
 */
export class TagBuilder {
  #options: TagBuilderOptions

  constructor(options: TagBuilderOptions = {}) {
    this.#options = options
  }

  /**
   * Returns true when the given path points to a stylesheet
   */
  isCssPath(path: string): boolean {
    return path.match(STYLE_FILE_REGEX) !== null
  }

  /**
   * Wraps an element descriptor so it serializes to an HTML string
   */
  element(element: AdonisViteElement): AdonisViteElement {
    return {
      ...element,
      toString() {
        const attributes = `${makeAttributes(element.attributes)}`
        if (element.tag === 'link') {
          return `<${element.tag} ${attributes}/>`
        }

        return `<${element.tag} ${attributes}>${element.children.join('\n')}</${element.tag}>`
      },
    }
  }

  /**
   * Resolves user supplied attributes (object or callback) for a given asset
   */
  #unwrapAttributes(src: string, url: string, attributes?: SetAttributes) {
    if (typeof attributes === 'function') {
      return attributes({ src, url })
    }
    return attributes
  }

  /**
   * Creates a stylesheet `<link>` tag
   */
  styleTag(src: string, url: string, attributes?: Record<string, any>): AdonisViteElement {
    const customAttributes = this.#unwrapAttributes(src, url, this.#options.styleAttributes)
    return this.element({
      tag: 'link',
      attributes: { rel: 'stylesheet', ...customAttributes, ...attributes, href: url },
    })
  }

  /**
   * Creates a `<script type="module">` tag
   */
  scriptTag(src: string, url: string, attributes?: Record<string, any>): AdonisViteElement {
    const customAttributes = this.#unwrapAttributes(src, url, this.#options.scriptAttributes)
    return this.element({
      tag: 'script',
      attributes: { type: 'module', ...customAttributes, ...attributes, src: url },
      children: [],
    })
  }

  /**
   * Creates a `<link rel="preload">` or `<link rel="modulepreload">` tag
   */
  preloadTag(url: string): AdonisViteElement {
    const attributes = this.isCssPath(url)
      ? { rel: 'preload', as: 'style', href: url }
      : { rel: 'modulepreload', href: url }

    return this.element({ tag: 'link', attributes })
  }

  /**
   * Creates the Vite HMR client `<script>` tag. Required in dev mode so
   * the browser receives module updates from the dev server.
   */
  viteClientScript(attributes?: Record<string, any>): AdonisViteElement {
    return this.element({
      tag: 'script',
      attributes: {
        type: 'module',
        src: '/@vite/client',
        ...attributes,
      },
      children: [],
    })
  }
}
