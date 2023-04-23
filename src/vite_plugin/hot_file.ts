/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { existsSync, rmSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { ConfigResolver } from './config_resolver.js'

export class HotFile {
  /**
   * Path to the hot file
   */
  #path: string

  /**
   * Register hooks to clean the hot file on exit
   */
  #cleanHotFileOnExit() {
    const clean = this.clean.bind(this)

    process.on('exit', clean)

    process.on('SIGINT', process.exit)
    process.on('SIGTERM', process.exit)
    process.on('SIGHUP', process.exit)
    process.on('SIGBREAK', process.exit)
    process.on('SIGKILL', process.exit)
  }

  constructor(path: string) {
    this.#path = join(ConfigResolver.resolvedConfig!.root, path)
    this.#cleanHotFileOnExit()
  }

  /**
   * Write the hot file
   */
  async write(data: { url: string }) {
    await mkdir(dirname(this.#path), { recursive: true })
    await writeFile(this.#path, JSON.stringify(data, null, 2))
  }

  /**
   * Delete the hot file
   */
  clean() {
    if (!existsSync(this.#path)) {
      return
    }

    rmSync(this.#path)
  }
}
