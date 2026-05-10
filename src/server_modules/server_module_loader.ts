/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { ViteDevServer } from 'vite'
import type { ModuleRunner } from 'vite/module-runner'

import { DevModuleRunner } from './dev_module_runner.ts'
import { BundledModuleResolver } from './bundled_module_resolver.ts'
import type { LoadServerModuleOptions } from '../types.ts'

/**
 * Public entry point for loading server-side modules processed by Vite.
 *
 * Picks between two collaborators based on whether the Vite dev server
 * is running:
 *
 * - In development, delegates to {@link DevModuleRunner} which evaluates
 *   the entry through Vite's `ModuleRunner`, with HMR-driven cache
 *   invalidation.
 * - In production, delegates to {@link BundledModuleResolver} which
 *   imports the pre-built bundle from disk.
 *
 * Entry strings are passed through verbatim to mirror how client
 * `entrypoints` are handled — the caller is responsible for using the
 * exact string declared in `serverEntrypoints`.
 */
export class ServerModuleLoader {
  #getDevServer: () => ViteDevServer | undefined
  #devRunner: DevModuleRunner
  #bundled: BundledModuleResolver

  constructor(
    getDevServer: () => ViteDevServer | undefined,
    buildDirectory: string,
    createRunner: () => Promise<ModuleRunner>
  ) {
    this.#getDevServer = getDevServer
    this.#devRunner = new DevModuleRunner(createRunner)
    this.#bundled = new BundledModuleResolver(buildDirectory)
  }

  async load<T>(entry: string, opts: LoadServerModuleOptions = {}): Promise<T> {
    const server = this.#getDevServer()

    if (server) {
      return this.#devRunner.import<T>(server, entry, opts)
    }

    return this.#bundled.import<T>(entry)
  }

  async close(): Promise<void> {
    await this.#devRunner.close()
  }
}
