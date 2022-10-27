import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { PluginOptions } from './contracts'

export class EntryPointFile {
  private entrypoints: Record<string, { files: string[] }> = {}

  constructor(private publicPath: string) {}

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
      this.entrypoints[entryPoint] = { files: [] }
    }

    const pathPrefixedWithPublicPath = filePath.map((path) => [this.publicPath, path].join('/'))

    this.entrypoints[entryPoint].files.push(...pathPrefixedWithPublicPath)
    return this
  }

  /**
   * Serialize the instance to the expected entrypoints.json format
   */
  public serialize() {
    return {
      url: this.publicPath,
      entrypoints: this.entrypoints,
    }
  }

  /**
   * Write the entrypoints.json file to the disk
   */
  public writeToDisk(path: string) {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, JSON.stringify(this.serialize()))
  }
}
