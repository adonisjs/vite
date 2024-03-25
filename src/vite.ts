/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { slash } from '@poppinss/utils'
import type { ViteRuntime } from 'vite/runtime'
import type {
  InlineConfig,
  MainThreadRuntimeOptions,
  Manifest,
  ModuleNode,
  ViteDevServer,
} from 'vite'

import { makeAttributes, uniqBy } from './utils.js'
import type { AdonisViteElement, SetAttributes, ViteOptions } from './types.js'

const styleFileRegex = /\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\?)/

/**
 * Vite class exposes the APIs to generate tags and URLs for
 * assets processed using vite.
 */
export class Vite {
  /**
   * We cache the manifest file content in production
   * to avoid reading the file multiple times
   */
  #manifestCache?: Manifest
  #options: ViteOptions
  #devServer?: ViteDevServer
  #createServerPromise?: Promise<ViteDevServer>

  constructor(
    protected isViteRunning: boolean,
    options: ViteOptions
  ) {
    this.#options = options
    this.#options.assetsUrl = (this.#options.assetsUrl || '/').replace(/\/$/, '')
  }

  /**
   * Reads the file contents as JSON
   */
  #readFileAsJSON(filePath: string) {
    return JSON.parse(readFileSync(filePath, 'utf-8'))
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
  #getViteHmrScript(attributes?: Record<string, any>) {
    return this.#generateElement({
      tag: 'script',
      attributes: {
        type: 'module',
        src: '/@vite/client',
        ...attributes,
      },
      children: [],
    })
  }

  /**
   * Check if the given path is a CSS path
   */
  #isCssPath(path: string) {
    return path.match(styleFileRegex) !== null
  }

  /**
   * If the module is a style module
   */
  #isStyleModule(mod: ModuleNode) {
    if (this.#isCssPath(mod.url) || (mod.id && /\?vue&type=style/.test(mod.id))) {
      return true
    }
    return false
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
   * Create a style tag for the given path
   */
  #makeStyleTag(src: string, url: string, attributes?: Record<string, any>): AdonisViteElement {
    const customAttributes = this.#unwrapAttributes(src, url, this.#options?.styleAttributes)
    return this.#generateElement({
      tag: 'link',
      attributes: { rel: 'stylesheet', ...customAttributes, ...attributes, href: url },
    })
  }

  /**
   * Create a script tag for the given path
   */
  #makeScriptTag(src: string, url: string, attributes?: Record<string, any>): AdonisViteElement {
    const customAttributes = this.#unwrapAttributes(src, url, this.#options?.scriptAttributes)
    return this.#generateElement({
      tag: 'script',
      attributes: { type: 'module', ...customAttributes, ...attributes, src: url },
      children: [],
    })
  }

  /**
   * Generate an asset URL for a given asset path
   */
  #generateAssetUrl(path: string): string {
    return `${this.#options.assetsUrl}/${path}`
  }

  /**
   * Generate a HTML tag for the given asset
   */
  #generateTag(asset: string, attributes?: Record<string, any>): AdonisViteElement {
    let url = ''
    if (this.isViteRunning) {
      url = `/${asset}`
    } else {
      url = this.#generateAssetUrl(asset)
    }

    if (this.#isCssPath(asset)) {
      return this.#makeStyleTag(asset, url, attributes)
    }

    return this.#makeScriptTag(asset, url, attributes)
  }

  /**
   * Collect CSS files from the module graph recursively
   */
  #collectCss(
    mod: ModuleNode,
    styleUrls: Set<string>,
    visitedModules: Set<string>,
    importer?: ModuleNode
  ): void {
    if (!mod.url) return

    /**
     * Prevent visiting the same module twice
     */
    if (visitedModules.has(mod.url)) return
    visitedModules.add(mod.url)

    if (this.#isStyleModule(mod) && (!importer || !this.#isStyleModule(importer))) {
      if (mod.url.startsWith('/')) {
        styleUrls.add(mod.url)
      } else if (mod.url.startsWith('\0')) {
        // virtual modules are prefixed with \0
        styleUrls.add(`/@id/__x00__${mod.url.substring(1)}`)
      } else {
        styleUrls.add(`/@id/${mod.url}`)
      }
    }

    mod.importedModules.forEach((dep) => this.#collectCss(dep, styleUrls, visitedModules, mod))
  }

  /**
   * Generate style and script tags for the given entrypoints
   * Also adds the @vite/client script
   */
  async #generateEntryPointsTagsForDevMode(
    entryPoints: string[],
    attributes?: Record<string, any>
  ): Promise<AdonisViteElement[]> {
    const server = this.getDevServer()!
    const runtime = await this.createRuntime()

    const tags = entryPoints.map((entrypoint) => this.#generateTag(entrypoint, attributes))
    const jsEntrypoints = entryPoints.filter((entrypoint) => !this.#isCssPath(entrypoint))

    /**
     * If the module graph is empty, that means we didn't execute the entrypoint
     * yet : we just started the AdonisJS dev server.
     * So let's execute the entrypoints to populate the module graph
     */
    if (server?.moduleGraph.idToModuleMap.size === 0) {
      await Promise.allSettled(
        jsEntrypoints.map((entrypoint) => runtime.executeEntrypoint(entrypoint))
      ).catch(console.error)
    }

    /**
     * We need to collect the CSS files imported by the entrypoints
     * Otherwise, we gonna have a FOUC each time we full reload the page
     */
    const preloadUrls = new Set<string>()
    const visitedModules = new Set<string>()
    const cssTagsElement = new Set<AdonisViteElement>()

    /**
     * Let's search for the CSS files by browsing the module graph
     * generated by Vite.
     */
    for (const entryPoint of jsEntrypoints) {
      const filePath = join(server.config.root, entryPoint)
      const entryMod = server.moduleGraph.getModuleById(slash(filePath))
      if (entryMod) this.#collectCss(entryMod, preloadUrls, visitedModules)
    }

    /**
     * Once we have the CSS files, generate associated tags
     * that will be injected into the HTML
     */
    const elements = Array.from(preloadUrls).map((href) =>
      this.#generateElement({
        tag: 'link',
        attributes: { rel: 'stylesheet', as: 'style', href: href },
      })
    )
    elements.forEach((element) => cssTagsElement.add(element))

    const viteHmr = this.#getViteHmrScript(attributes)
    const result = [...cssTagsElement, viteHmr].concat(tags)

    return result.sort((tag) => (tag.tag === 'link' ? -1 : 1))
  }

  /**
   * Get a chunk from the manifest file for a given file name
   */
  #chunk(manifest: Manifest, entrypoint: string) {
    const chunk = manifest[entrypoint]

    if (!chunk) {
      throw new Error(`Cannot find "${entrypoint}" chunk in the manifest file`)
    }

    return chunk
  }

  /**
   * Get a list of chunks for a given filename
   */
  #chunksByFile(manifest: Manifest, file: string) {
    return Object.entries(manifest)
      .filter(([, chunk]) => chunk.file === file)
      .map(([_, chunk]) => chunk)
  }

  /**
   * Generate preload tag for a given url
   */
  #makePreloadTagForUrl(url: string) {
    const attributes = this.#isCssPath(url)
      ? { rel: 'preload', as: 'style', href: url }
      : { rel: 'modulepreload', href: url }

    return this.#generateElement({ tag: 'link', attributes })
  }

  /**
   * Generate style and script tags for the given entrypoints
   * using the manifest file
   */
  #generateEntryPointsTagsWithManifest(
    entryPoints: string[],
    attributes?: Record<string, any>
  ): AdonisViteElement[] {
    const manifest = this.manifest()
    const tags: { path: string; tag: AdonisViteElement }[] = []
    const preloads: Array<{ path: string }> = []

    for (const entryPoint of entryPoints) {
      /**
       * 1. We generate tags + modulepreload for the entrypoint
       */
      const chunk = this.#chunk(manifest, entryPoint)
      preloads.push({ path: this.#generateAssetUrl(chunk.file) })
      tags.push({
        path: chunk.file,
        tag: this.#generateTag(chunk.file, { ...attributes, integrity: chunk.integrity }),
      })

      /**
       * 2. We go through the CSS files that are imported by the entrypoint
       * and generate tags + preload for them
       */
      for (const css of chunk.css || []) {
        preloads.push({ path: this.#generateAssetUrl(css) })
        tags.push({ path: css, tag: this.#generateTag(css) })
      }

      /**
       * 3. We go through every import of the entrypoint and generate preload
       */
      for (const importNode of chunk.imports || []) {
        preloads.push({ path: this.#generateAssetUrl(manifest[importNode].file) })

        /**
         * 4. Finally, we generate tags + preload for the CSS files imported by the import
         * of the entrypoint
         */
        for (const css of manifest[importNode].css || []) {
          const subChunk = this.#chunksByFile(manifest, css)

          preloads.push({ path: this.#generateAssetUrl(css) })
          tags.push({
            path: this.#generateAssetUrl(css),
            tag: this.#generateTag(css, {
              ...attributes,
              integrity: subChunk[0]?.integrity,
            }),
          })
        }
      }
    }

    /**
     * We sort the preload to ensure that CSS files are preloaded first
     */
    const preloadsElements = uniqBy(preloads, 'path')
      .sort((preload) => (this.#isCssPath(preload.path) ? -1 : 1))
      .map((preload) => this.#makePreloadTagForUrl(preload.path))

    /**
     * And finally, we return the preloads + script and link tags
     */
    return preloadsElements.concat(tags.map(({ tag }) => tag))
  }

  /**
   * Generate tags for the entry points
   */
  async generateEntryPointsTags(
    entryPoints: string[] | string,
    attributes?: Record<string, any>
  ): Promise<AdonisViteElement[]> {
    entryPoints = Array.isArray(entryPoints) ? entryPoints : [entryPoints]

    if (this.isViteRunning) {
      return this.#generateEntryPointsTagsForDevMode(entryPoints, attributes)
    }

    return this.#generateEntryPointsTagsWithManifest(entryPoints, attributes)
  }

  /**
   * Returns the explicitly configured assetsUrl
   */
  assetsUrl() {
    return this.#options.assetsUrl
  }

  /**
   * Returns path to a given asset file using the manifest file
   */
  assetPath(asset: string): string {
    if (this.isViteRunning) {
      return `/${asset}`
    }

    const chunk = this.#chunk(this.manifest(), asset)
    return this.#generateAssetUrl(chunk.file)
  }

  /**
   * Returns the manifest file contents
   *
   * @throws Will throw an exception when running in dev
   */
  manifest(): Manifest {
    if (this.isViteRunning) {
      throw new Error('Cannot read the manifest file when running in dev mode')
    }

    if (!this.#manifestCache) {
      this.#manifestCache = this.#readFileAsJSON(this.#options.manifestFile)
    }

    return this.#manifestCache!
  }

  /**
   * Create the Vite Dev Server and runtime
   *
   * We lazy load the APIs to avoid loading it in production
   * since we don't need it
   */
  async createDevServer(options?: InlineConfig) {
    const { createServer } = await import('vite')

    /**
     * We do not await the server creation since it will
     * slow down the boot process of AdonisJS
     */
    this.#createServerPromise = createServer({
      server: { middlewareMode: true, hmr: { port: 3001 } },
      appType: 'custom',
      ...options,
    })

    this.#devServer = await this.#createServerPromise
  }

  /**
   * Create a runtime instance
   * Will not be available when running in production since
   * it needs the Vite Dev server
   */
  async createRuntime(options: MainThreadRuntimeOptions = {}): Promise<ViteRuntime> {
    const { createViteRuntime } = await import('vite')

    return createViteRuntime(this.#devServer!, options)
  }

  /**
   * Stop the Vite Dev server
   */
  async stopDevServer() {
    await this.#createServerPromise
    await this.#devServer?.close()
  }

  /**
   * Get the Vite Dev server instance
   * Will not be available when running in production
   */
  getDevServer() {
    return this.#devServer
  }

  /**
   * Returns the script needed for the HMR working with React
   */
  getReactHmrScript(attributes?: Record<string, any>): AdonisViteElement | null {
    if (!this.isViteRunning) {
      return null
    }

    return this.#generateElement({
      tag: 'script',
      attributes: {
        type: 'module',
        ...attributes,
      },
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
}
