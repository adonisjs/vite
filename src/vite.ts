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
import { existsSync, readFileSync } from 'node:fs'
import { type ModuleRunner } from 'vite/module-runner'
import type {
  Manifest,
  ModuleNode,
  InlineConfig,
  ViteDevServer,
  ServerModuleRunnerOptions,
} from 'vite'

import { makeAttributes, uniqBy } from './utils.ts'
import type { AdonisViteElement, SetAttributes, ViteOptions } from './types.ts'

const STYLE_FILE_REGEX = /\.(css|less|sass|scss|styl|stylus|pcss|postcss)($|\?)/

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

  /**
   * Indicates whether the Vite manifest file exists on disk
   */
  hasManifestFile: boolean

  /**
   * Creates a new Vite instance for managing asset compilation and serving
   *
   * @param options - Configuration options for Vite integration
   *
   * @example
   * const vite = new Vite({
   *   buildDirectory: 'build',
   *   assetsUrl: '/assets',
   *   manifestFile: 'build/manifest.json'
   * })
   */
  constructor(options: ViteOptions) {
    this.#options = options
    this.#options.assetsUrl = (this.#options.assetsUrl || '/').replace(/\/$/, '')
    this.hasManifestFile = existsSync(this.#options.manifestFile)
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
    return path.match(STYLE_FILE_REGEX) !== null
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
    if (!this.hasManifestFile) {
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
    if (!mod.url) {
      return
    }

    /**
     * Prevent visiting the same module twice
     */
    if (visitedModules.has(mod.url)) {
      return
    }

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

    const tags = entryPoints.map((entrypoint) => this.#generateTag(entrypoint, attributes))
    const jsEntrypoints = entryPoints.filter((entrypoint) => !this.#isCssPath(entrypoint))

    /**
     * If the module graph is empty, that means we didn't execute the entrypoint
     * yet : we just started the AdonisJS dev server.
     * So let's execute the entrypoints to populate the module graph
     */
    if (server?.moduleGraph.idToModuleMap.size === 0) {
      await Promise.allSettled(
        jsEntrypoints.map((entrypoint) => server.warmupRequest(`/${entrypoint}`))
      )
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
      const entryMod = server.moduleGraph.getModuleById(string.toUnixSlash(filePath))
      if (entryMod) {
        this.#collectCss(entryMod, preloadUrls, visitedModules)
      }
    }

    /**
     * Once we have the CSS files, generate associated tags
     * that will be injected into the HTML
     */
    const elements = Array.from(preloadUrls).map((href) =>
      this.#generateElement({
        tag: 'link',
        attributes: { rel: 'stylesheet', href: href },
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
  async generateEntryPointsTags(
    entryPoints: string[] | string,
    attributes?: Record<string, any>
  ): Promise<AdonisViteElement[]> {
    entryPoints = Array.isArray(entryPoints) ? entryPoints : [entryPoints]

    if (!this.hasManifestFile) {
      return this.#generateEntryPointsTagsForDevMode(entryPoints, attributes)
    }

    return this.#generateEntryPointsTagsWithManifest(entryPoints, attributes)
  }

  /**
   * Returns the base URL for serving static assets
   *
   * @example
   * const url = vite.assetsUrl()
   * // Returns: '/assets' or '/build' depending on configuration
   */
  assetsUrl() {
    return this.#options.assetsUrl
  }

  /**
   * Returns the full URL path to a specific asset file
   *
   * In development mode, returns the asset path with leading slash.
   * In production mode, uses the manifest file to return the versioned/hashed asset URL.
   *
   * @param asset - The relative path to the asset file
   *
   * @example
   * const path = vite.assetPath('images/logo.png')
   * // Dev: '/images/logo.png'
   * // Prod: '/assets/images/logo-abc123.png'
   */
  assetPath(asset: string): string {
    if (!this.hasManifestFile) {
      return `/${asset}`
    }

    const chunk = this.#chunk(this.manifest(), asset)
    return this.#generateAssetUrl(chunk.file)
  }

  /**
   * Returns the parsed Vite manifest file contents
   *
   * The manifest file contains information about compiled assets including
   * file paths, integrity hashes, and import dependencies.
   *
   * @throws Will throw an exception when running in development mode
   *
   * @example
   * const manifest = vite.manifest()
   * console.log(manifest['app.js'].file) // 'assets/app-abc123.js'
   */
  manifest(): Manifest {
    if (!this.hasManifestFile) {
      throw new Error('Cannot read the manifest file when running in dev mode')
    }

    if (!this.#manifestCache) {
      this.#manifestCache = this.#readFileAsJSON(this.#options.manifestFile)
    }

    return this.#manifestCache!
  }

  /**
   * Creates and initializes the Vite development server
   *
   * Lazy loads Vite APIs to avoid importing them in production.
   * The server runs in middleware mode and is configured for custom app integration.
   *
   * @param options - Additional Vite configuration options to merge with defaults
   *
   * @example
   * await vite.createDevServer({
   *   root: './src',
   *   server: { port: 3000 }
   * })
   */
  async createDevServer(options?: InlineConfig) {
    const { createServer } = await import('vite')

    /**
     * We do not await the server creation since it will
     * slow down the boot process of AdonisJS
     */
    this.#devServer = await createServer({
      server: { middlewareMode: true },
      appType: 'custom',
      ...options,
    })
  }

  /**
   * Creates a server-side module runner for executing modules in Node.js context
   *
   * Only available in development mode as it requires the Vite dev server.
   * Useful for server-side rendering and module transformation.
   *
   * @param options - Configuration options for the module runner
   *
   * @example
   * const runner = await vite.createModuleRunner({
   *   hmr: { port: 24678 }
   * })
   * const mod = await runner.import('./app.js')
   */
  async createModuleRunner(options: ServerModuleRunnerOptions = {}): Promise<ModuleRunner> {
    const { createServerModuleRunner } = await import('vite')
    return createServerModuleRunner(this.#devServer!.environments.ssr, options)
  }

  /**
   * Gracefully stops the Vite development server
   *
   * Waits for the server creation promise to complete before closing.
   *
   * @example
   * await vite.stopDevServer()
   */
  async stopDevServer() {
    await this.#devServer?.close()
  }

  /**
   * Returns the Vite development server instance
   *
   * Only available in development mode after calling createDevServer().
   * Returns undefined in production or if the server hasn't been created yet.
   *
   * @example
   * const server = vite.getDevServer()
   * if (server) {
   *   console.log('Dev server is running on', server.config.server.port)
   * }
   */
  getDevServer() {
    return this.#devServer
  }

  /**
   * Generates the React Hot Module Replacement (HMR) script for development
   *
   * Only returns a script element in development mode. In production mode,
   * returns null since HMR is not needed.
   *
   * @param attributes - Additional HTML attributes to apply to the script tag
   *
   * @example
   * const hmrScript = vite.getReactHmrScript({ async: true })
   * if (hmrScript) {
   *   console.log(hmrScript.toString()) // <script type="module" async>...</script>
   * }
   */
  getReactHmrScript(attributes?: Record<string, any>): AdonisViteElement | null {
    if (this.hasManifestFile) {
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
