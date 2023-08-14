/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import type { Manifest } from 'vite'
import { existsSync, readFileSync } from 'node:fs'

import debug from './debug.js'
import { makeAttributes, uniqBy } from './utils.js'
import type { AdonisViteElement, HotFile, SetAttributes, ViteOptions } from './types/main.js'

/**
 * Vite class exposes the APIs to generate tags and URLs for
 * assets processed using vite.
 */
export class Vite {
  /**
   * Manifest file name
   */
  #manifestFilename = 'manifest.json'

  /**
   * We cache the manifest file content in production
   * to avoid reading the file multiple times
   */
  #manifestCache: Manifest | null = null

  /**
   * Configuration options
   */
  #options: ViteOptions

  constructor(options: ViteOptions) {
    this.#options = options
    this.#options.assetsUrl = (this.#options.assetsUrl || '/').replace(/\/$/, '')
    debug('vite config %O', this.#options)
  }

  /**
   * Checks if the application is running in hot mode
   */
  #isRunningHot(): boolean {
    return existsSync(this.#options.hotFile)
  }

  /**
   * Reads the file contents as JSON
   */
  #readFileAsJSON(filePath: string) {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
  }

  /**
   * Returns the parsed hot file content
   */
  #readHotFile(): HotFile {
    return this.#readFileAsJSON(this.#options.hotFile)
  }

  /**
   * Get the path to an asset when running in hot mode
   */
  #hotAsset(asset: string) {
    return this.#readHotFile().url + '/' + asset
  }

  /**
   * Unwrap attributes from the user defined function or return
   * the attributes as it is
   */
  #unwrapAttributes(src: string, url: string, attributes?: SetAttributes) {
    if (typeof attributes === 'function') {
      return attributes({ src, url })
    }

    return attributes
  }

  /**
   * Create a script tag for the given path
   */
  #makeScriptTag(src: string, url: string): AdonisViteElement {
    const customAttributes = this.#unwrapAttributes(src, url, this.#options.scriptAttributes)
    const attributes = { type: 'module', ...customAttributes, src: url }
    return this.#generateElement({
      tag: 'script',
      attributes,
      children: [],
    })
  }

  /**
   * Create a style tag for the given path
   */
  #makeStyleTag(src: string, url: string): AdonisViteElement {
    const customAttributes = this.#unwrapAttributes(src, url, this.#options.styleAttributes)
    const attributes = { rel: 'stylesheet', ...customAttributes, href: url }

    return this.#generateElement({
      tag: 'link',
      attributes,
    })
  }

  /**
   * Generate a HTML tag for the given asset
   */
  #generateTag(asset: string): AdonisViteElement {
    let url = ''
    if (this.#isRunningHot()) {
      url = this.#hotAsset(asset)
    } else {
      url = `${this.#options.assetsUrl}/${asset}`
    }

    if (this.#isCssPath(asset)) {
      return this.#makeStyleTag(asset, url)
    }

    return this.#makeScriptTag(asset, url)
  }

  /**
   * Generates a JSON element with a custom toString implementation
   */
  #generateElement(element: AdonisViteElement) {
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
   * Returns the script needed for the HMR working with Vite
   */
  #getViteHmrScript(): AdonisViteElement | null {
    return this.#generateElement({
      tag: 'script',
      attributes: {
        type: 'module',
        src: this.#hotAsset('@vite/client'),
      },
      children: [],
    })
  }

  /**
   * Generate style and script tags for the given entrypoints
   * Also adds the @vite/client script
   */
  #generateEntryPointsTagsForHotMode(entryPoints: string[]): AdonisViteElement[] {
    const viteHmr = this.#getViteHmrScript()
    const tags = entryPoints.map((entrypoint) => this.#generateTag(entrypoint))

    return viteHmr ? [viteHmr].concat(tags) : tags
  }

  /**
   * Generate style and script tags for the given entrypoints
   * using the manifest file
   */
  #generateEntryPointsTagsWithManifest(entryPoints: string[]): AdonisViteElement[] {
    const manifest = this.manifest()
    const tags: { path: string; tag: AdonisViteElement }[] = []

    for (const entryPoint of entryPoints) {
      const chunk = this.#chunk(manifest, entryPoint)
      tags.push({ path: chunk.file, tag: this.#generateTag(chunk.file) })

      for (const css of chunk.css || []) {
        const cssChunk = this.#chunkByFile(manifest, css)
        tags.push({ path: cssChunk.file, tag: this.#generateTag(cssChunk.file) })
      }
    }

    return uniqBy(tags, 'path')
      .sort((a) => (a.path.endsWith('.css') ? -1 : 1))
      .map((tag) => tag.tag)
  }

  /**
   * Get a chunk from the manifest file for a given file name
   */
  #chunk(manifest: Manifest, fileName: string) {
    const chunk = manifest[fileName]

    if (!chunk) {
      throw new Error(`Cannot find "${fileName}" chunk in the manifest file`)
    }

    return chunk
  }

  /**
   * Get a chunk from the manifest file for a given hashed file name
   */
  #chunkByFile(manifest: Manifest, fileName: string) {
    const chunk = Object.values(manifest).find((c) => c.file === fileName)

    if (!chunk) {
      throw new Error(`Cannot find "${fileName}" chunk in the manifest file`)
    }

    return chunk
  }

  /**
   * Check if the given path is a CSS path
   */
  #isCssPath(path: string) {
    return path.match(/\.(css|less|sass|scss|styl|stylus|pcss|postcss)$/) !== null
  }

  /**
   * Generate tags for the entry points
   */
  generateEntryPointsTags(entryPoints: string[] | string): AdonisViteElement[] {
    entryPoints = Array.isArray(entryPoints) ? entryPoints : [entryPoints]

    if (this.#isRunningHot()) {
      return this.#generateEntryPointsTagsForHotMode(entryPoints)
    }

    return this.#generateEntryPointsTagsWithManifest(entryPoints)
  }

  /**
   * Returns path to a given asset file
   */
  assetPath(asset: string): string {
    if (this.#isRunningHot()) {
      return this.#hotAsset(asset)
    }

    const chunk = this.#chunk(this.manifest(), asset)
    return `${this.#options.assetsUrl}/${chunk.file}`
  }

  /**
   * Returns the manifest file contents
   *
   * @throws Will throw an exception when running in hot mode
   */
  manifest(): Manifest {
    if (this.#isRunningHot()) {
      throw new Error('Cannot read the manifest file when running in hot mode')
    }

    /**
     * Use in-memory cache when available
     */
    if (this.#manifestCache) {
      return this.#manifestCache
    }

    const manifest = this.#readFileAsJSON(
      join(this.#options.buildDirectory, this.#manifestFilename)
    )

    /**
     * Cache the manifest when cache flag is enabled
     */
    if (this.#options.cache) {
      this.#manifestCache = manifest
    }

    return manifest
  }

  /**
   * Returns the script needed for the HMR working with React
   */
  getReactHmrScript(): AdonisViteElement | null {
    if (!this.#isRunningHot()) {
      return null
    }

    return {
      tag: 'script',
      attributes: {
        type: 'module',
      },
      children: [
        `import RefreshRuntime from '${this.#hotAsset('@react-refresh')}'`,
        `RefreshRuntime.injectIntoGlobalHook(window)`,
        `window.$RefreshReg$ = () => {}`,
        `window.$RefreshSig$ = () => (type) => type`,
        `window.__vite_plugin_react_preamble_installed__ = true`,
      ],
    }
  }
}
