/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { existsSync, readFileSync } from 'node:fs'
import type { Manifest } from 'vite'

/**
 * Resolves and imports server-side modules from the production SSR build.
 *
 * In production there is no Vite dev server — entry points declared as
 * `serverEntryPoints` are pre-built into `<buildDirectory>/server` and
 * recorded in `<buildDirectory>/server/.vite/manifest.json`. The
 * resolver reads that manifest to map an entry source path to the
 * emitted bundle file, then imports it through Node's native `import()`.
 *
 * Imports are cached per entry so repeated calls reuse the same module
 * instance and side-effects only run once.
 */
export class BundledModuleResolver {
  /**
   * Absolute path to `<buildDirectory>/server`.
   */
  #serverDir: string

  /**
   * Cache of in-flight or resolved module imports, keyed by entry.
   * Stores the promise so concurrent callers share the same import.
   */
  #cache = new Map<string, Promise<unknown>>()

  /**
   * Lazily-loaded manifest contents. Loaded once on first import call.
   */
  #manifest?: Manifest

  constructor(buildDirectory: string) {
    this.#serverDir = join(buildDirectory, 'server')
  }

  async import<T>(entry: string): Promise<T> {
    let pending = this.#cache.get(entry)
    if (!pending) {
      const manifest = this.#readManifest()
      const chunk = manifest[entry]
      if (!chunk) {
        throw new Error(
          `Cannot loadServerModule("${entry}"): no chunk for this entry in ` +
            `the SSR manifest. Make sure the entry is declared in ` +
            `serverEntryPoints and the application has been rebuilt.`
        )
      }

      const filePath = join(this.#serverDir, chunk.file)
      pending = import(pathToFileURL(filePath).href)
      this.#cache.set(entry, pending)
    }

    return pending as Promise<T>
  }

  #readManifest(): Manifest {
    if (this.#manifest) {
      return this.#manifest
    }

    const manifestPath = join(this.#serverDir, '.vite/manifest.json')
    if (!existsSync(manifestPath)) {
      throw new Error(
        `SSR manifest not found at ${manifestPath}. Build the application ` +
          `with at least one declared serverEntrypoint before loading server modules.`
      )
    }

    this.#manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    return this.#manifest!
  }
}
