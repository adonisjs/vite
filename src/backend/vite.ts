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
import { fileURLToPath } from 'node:url'
import { HotFile, SetAttributes } from './types/main.js'
import { existsSync, readFileSync } from 'node:fs'
import { ApplicationService } from '@adonisjs/core/types'
import { uniqBy } from './utils.js'

export class Vite {
  /**
   * Path to the build directory
   *
   * @default 'public/assets'
   */
  #buildDirectory: string

  /**
   * Path to the hotfile
   *
   * @default 'public/assets/hot.json'
   */
  #hotFile: string

  /**
   * Manifest file name
   */
  #manifestFilename = 'manifest.json'

  /**
   * Assets URL
   */
  #assetsUrl = ''

  /**
   * We cache the manifest file content in production
   * to avoid reading the file multiple times
   */
  #manifestCache: Manifest | null = null

  /**
   * Attributes to be set on the style tags
   */
  #styleAttributes: SetAttributes = {}

  /**
   * Attributes to be set on the script tags
   */
  #scriptAttributes: SetAttributes = {}

  constructor(private application: ApplicationService) {
    this.#buildDirectory = this.application.publicPath('assets')
    this.#hotFile = join(this.#buildDirectory, 'hot.json')
  }

  /**
   * Checks if the application is running in hot mode
   */
  #isRunningHot(): boolean {
    return existsSync(this.#hotFile)
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
    return this.#readFileAsJSON(this.#hotFile)
  }

  /**
   * Get the path to an asset when running in hot mode
   */
  #hotAsset(asset: string) {
    return this.#readHotFile().url + '/' + asset
  }

  /**
   * Returns the script needed for the HMR working with Vite
   */
  #getViteHmrScript(): string {
    if (!this.#isRunningHot()) {
      return ''
    }

    return `<script type="module" src="${this.#hotAsset('@vite/client')}"></script>`
  }

  /**
   * Generate style and script tags for the given entrypoints
   * Also add the @vite/client script
   */
  #generateEntryPointsTagsForHotmode(entryPoints: string[]): string {
    const viteHmr = this.#getViteHmrScript()
    const tags = entryPoints.map((entrypoint) => this.#generateTag(entrypoint))

    return [viteHmr, ...tags].join('\n')
  }

  /**
   * Generate style and script tags for the given entrypoints
   * using the manifest file
   */
  #generateEntryPointsTagsWithManifest(entryPoints: string[]): string {
    const manifest = this.manifest()
    const tags: { path: string; tag: string }[] = []

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
      .map((preload) => preload.tag)
      .join('\n')
  }

  /**
   * Generate tags for the entry points
   */
  generateEntryPointsTags(entryPoints: string[] | string): string {
    entryPoints = Array.isArray(entryPoints) ? entryPoints : [entryPoints]

    if (this.#isRunningHot()) {
      return this.#generateEntryPointsTagsForHotmode(entryPoints)
    }

    return this.#generateEntryPointsTagsWithManifest(entryPoints)
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
   * Generate a HTML tag for the given asset
   */
  #generateTag(asset: string): string {
    let url = ''
    if (this.#isRunningHot()) {
      url = this.#hotAsset(asset)
    } else {
      url = `${this.#assetsUrl}/assets/${asset}`
    }

    if (this.#isCssPath(asset)) {
      return this.#makeStyleTag(asset, url)
    }

    return this.#makeScriptTag(asset, url)
  }

  /**
   * Unwrap attributes from the user defined function or return
   * the attributes as it is
   */
  #unwrapAttributes(src: string, url: string, attributes: SetAttributes) {
    if (typeof attributes === 'function') {
      return attributes({ src, url })
    }

    return attributes
  }

  /**
   * Convert Record of attributes to a valid HTML string
   */
  #makeAttributes(attributes: Record<string, string | boolean>) {
    return Object.keys(attributes)
      .map((key) => {
        const value = attributes[key]
        if (value === true) return key
        if (value === false) return null

        return `${key}="${value}"`
      })
      .filter((attr) => attr !== null)
      .join(' ')
  }

  /**
   * Create a script tag for the given path
   */
  #makeScriptTag(src: string, url: string) {
    const customAttributes = this.#unwrapAttributes(src, url, this.#scriptAttributes)
    const attributes = { type: 'module', ...customAttributes }

    return `<script ${this.#makeAttributes(attributes)} src="${url}"></script>`
  }

  /**
   * Create a style tag for the given path
   */
  #makeStyleTag(src: string, url: string) {
    const customAttributes = this.#unwrapAttributes(src, url, this.#styleAttributes)
    const attributes = { rel: 'stylesheet', ...customAttributes }

    return `<link ${this.#makeAttributes(attributes)} href="${url}">`
  }

  /**
   * Returns path to a given asset file
   */
  assetPath(asset: string) {
    if (this.#isRunningHot()) {
      return this.#hotAsset(asset)
    }

    const chunk = this.#chunk(this.manifest(), asset)
    return `${this.#assetsUrl}/assets/${chunk.file}`
  }

  /**
   * Returns the manifest file content
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

    const manifest = this.#readFileAsJSON(join(this.#buildDirectory, this.#manifestFilename))

    /**
     * Cache the manifest in production to avoid re-reading the file from disk
     */
    if (this.application.inProduction) {
      this.#manifestCache = manifest
    }

    return manifest
  }

  /**
   * Returns the script needed for the HMR working with React
   *
   * This method is called automatically when using edge tag `@viteReactRefresh`
   */
  getReactHmrScript(): string {
    if (!this.#isRunningHot()) {
      return ''
    }

    return `
      <script type="module">
        import RefreshRuntime from '${this.#hotAsset('@react-refresh')}'
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => {}
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>
      `
  }

  /**
   * Set the path to the hotfile
   *
   * You must also set the `hotFile` option in the vite plugin config
   */
  setHotFilePath(path: string) {
    this.#hotFile = join(fileURLToPath(this.application.appRoot), path)
    return this
  }

  /**
   * Set the manifest filename
   *
   * You must also set the `build.manifest` option in your vite configuration
   */
  setManifestFilename(name: string) {
    this.#manifestFilename = name
    return this
  }

  /**
   * Set the build directory. Subdirectory of the AdonisJs public directory
   *
   * You must also set the `buildDirectory` option in the vite plugin config
   */
  setBuildDirectory(path: string) {
    this.#buildDirectory = this.application.publicPath(path)
    return this
  }

  /**
   * Set the assets url
   *
   * You must also set the `assetsUrl` option in the vite plugin config
   */
  setAssetsUrl(url: string) {
    this.#assetsUrl = url.endsWith('/') ? url : `${url}/`
    return this
  }

  /**
   * Include additional attributes to each script tag generated
   */
  setScriptAttributes(attributes: SetAttributes) {
    this.#scriptAttributes = attributes
    return this
  }

  /**
   * Include additional attributes to each style tag generated
   */
  setStyleAttributes(attributes: SetAttributes) {
    this.#styleAttributes = attributes
    return this
  }
}
