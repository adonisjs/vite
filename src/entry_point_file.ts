import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { normalizePath } from 'vite'
import { PluginOptions } from './contracts'

export class EntryPointFile {
  private entrypoints: Record<string, { js: string[]; css: string[] }> = {}

  private readonly CSS_EXTENSIONS = [
    '.css',
    '.scss',
    '.sass',
    '.less',
    '.styl',
    '.pcss',
    '.postcss',
    '.stylus',
  ]

  private readonly JS_EXTENSIONS = ['.js', '.mjs', '.ts', '.tsx', '.jsx', '.cjs', '.mts', '.cts']

  constructor(private publicPath: string) {}

  /**
   * Is the given file a javascript file
   */
  private isJsFile(file: string) {
    return this.JS_EXTENSIONS.some((ext) => file.endsWith(ext))
  }

  /**
   * Is the given file a css file
   */
  private isCssFile(file: string) {
    return this.CSS_EXTENSIONS.some((ext) => file.endsWith(ext))
  }

  /**
   * Create a new instance from the Plugin Options `entryPoints` property that
   * the user has defined in his vite.config.ts file.
   */
  public static fromPluginInput(input: PluginOptions['entryPoints'], publicPath: string) {
    const file = new EntryPointFile(publicPath)

    for (const [name, files] of Object.entries(input)) {
      file.addFilesToEntryPoint(name, files)
    }

    return file
  }

  /**
   * Add a new file to an entrypoint group
   */
  public addFilesToEntryPoint(entryPoint: string, filePath: string[]) {
    if (!this.entrypoints[entryPoint]) {
      this.entrypoints[entryPoint] = { js: [], css: [] }
    }

    const pathPrefixedWithPublicPath = filePath
      .map((path) => normalizePath(path))
      .map((path) => [this.publicPath, path].join('/'))

    for (const file of pathPrefixedWithPublicPath) {
      if (this.isJsFile(file)) {
        this.entrypoints[entryPoint].js.push(file)
      } else if (this.isCssFile(file)) {
        this.entrypoints[entryPoint].css.push(file)
      }
    }

    return this
  }

  /**
   * Serialize the instance to the expected entrypoints.json format
   */
  public serialize() {
    return JSON.stringify({ url: this.publicPath, entrypoints: this.entrypoints }, null, 2)
  }

  /**
   * Write the entrypoints.json file to the disk
   */
  public writeToDisk(path: string) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, this.serialize())
  }
}
