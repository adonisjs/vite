/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ManifestLoader } from '../manifest_loader.ts'
import type { AssetUrlBuilder } from '../types.ts'

/**
 * Resolves asset URLs against a built manifest. The asset name is looked
 * up in the manifest and its hashed output file is prefixed with the
 * configured assets URL.
 */
export class BuildAssetUrlBuilder implements AssetUrlBuilder {
  #assetsUrl: string
  #manifestLoader: ManifestLoader

  constructor(assetsUrl: string, manifestLoader: ManifestLoader) {
    this.#assetsUrl = assetsUrl
    this.#manifestLoader = manifestLoader
  }

  /**
   * Prefixes a compiled file path with the configured assets URL.
   * Used for raw file paths that already came from the manifest.
   */
  prefix(file: string): string {
    return `${this.#assetsUrl}/${file}`
  }

  urlFor(asset: string): string {
    const chunk = this.#manifestLoader.getChunk(asset)
    return this.prefix(chunk.file)
  }
}
