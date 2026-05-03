/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { existsSync, readFileSync } from 'node:fs'
import type { Manifest, ManifestChunk } from 'vite'

/**
 * Reads and queries a Vite manifest file. The manifest is loaded lazily
 * on first access and cached for the lifetime of the loader.
 */
export class ManifestLoader {
  #filePath: string
  #cache?: Manifest

  constructor(filePath: string) {
    this.#filePath = filePath
  }

  /**
   * Returns true when the manifest file exists on disk
   */
  hasFile(): boolean {
    return existsSync(this.#filePath)
  }

  /**
   * Loads the manifest from disk on first call, returns the cached value after
   */
  load(): Manifest {
    if (!this.hasFile()) {
      throw new Error('Missing manifest file. Make sure to first create a build')
    }

    if (!this.#cache) {
      this.#cache = JSON.parse(readFileSync(this.#filePath, 'utf-8'))
    }

    return this.#cache!
  }

  /**
   * Looks up a chunk by entrypoint name. Throws when the entrypoint is missing.
   */
  getChunk(entrypoint: string): ManifestChunk {
    const manifest = this.load()
    const chunk = manifest[entrypoint]

    if (!chunk) {
      throw new Error(`Cannot find "${entrypoint}" chunk in the manifest file`)
    }

    return chunk
  }

  /**
   * Returns all chunks whose compiled output matches the given file name
   */
  chunksByFile(file: string): ManifestChunk[] {
    const manifest = this.load()
    return Object.values(manifest).filter((chunk) => chunk.file === file)
  }
}
