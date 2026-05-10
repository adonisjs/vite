/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { DevEnvironment, ViteDevServer } from 'vite'
import type { ModuleRunner } from 'vite/module-runner'

import type { LoadServerModuleOptions } from '../types.ts'

/**
 * Hosts the Vite `ModuleRunner` used to evaluate server-side modules in
 * development mode.
 *
 * Owns a single shared runner across all `loadServerModule` calls, and
 * detects Vite dev server restarts (which replace `server.environments.ssr`
 * with a fresh instance) so the stale runner is closed and recreated.
 */
export class DevModuleRunner {
  /**
   * Shared module runner. Lazy-created on first import.
   */
  #runner?: ModuleRunner

  /**
   * Reference to the SSR environment the current runner was created from.
   * When Vite restarts the dev server, `server.environments.ssr` is
   * replaced — we use this reference to detect that and recreate.
   */
  #ssrEnvironment?: DevEnvironment

  /**
   * Factory provided by the orchestrator to lazily create the runner.
   * Indirection keeps this class decoupled from how the runner is built.
   */
  #createRunner: () => Promise<ModuleRunner>

  constructor(createRunner: () => Promise<ModuleRunner>) {
    this.#createRunner = createRunner
  }

  /**
   * Imports a module through the runner. Recreates the runner if the
   * dev server's SSR environment was swapped underneath us.
   */
  async import<T>(
    server: ViteDevServer,
    entry: string,
    opts: LoadServerModuleOptions
  ): Promise<T> {
    const currentSsrEnv = server.environments.ssr

    if (this.#ssrEnvironment !== currentSsrEnv) {
      if (this.#runner) {
        await this.#runner.close()
      }
      this.#runner = undefined
      this.#ssrEnvironment = currentSsrEnv
    }

    this.#runner ??= await this.#createRunner()

    if (opts.fresh) {
      this.#runner.clearCache()
    }

    return this.#runner.import(entry)
  }

  /**
   * Closes the runner, if any. Safe to call when no runner has been
   * created yet.
   */
  async close(): Promise<void> {
    if (this.#runner) {
      await this.#runner.close()
      this.#runner = undefined
      this.#ssrEnvironment = undefined
    }
  }
}
