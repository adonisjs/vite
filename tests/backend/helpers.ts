/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { getActiveTest } from '@japa/runner'

import { Vite } from '../../index.js'
import { ViteOptions } from '../../src/types.js'
import { InlineConfig } from 'vite'

export const BASE_URL = new URL('./../__app/', import.meta.url)

/**
 * Create an instance of AdonisJS Vite class, run the dev server
 * and auto close it when the test ends
 */
export async function createVite(config: ViteOptions, viteConfig: InlineConfig = {}) {
  const test = getActiveTest()
  if (!test) {
    throw new Error('Cannot create vite instance outside of a test')
  }

  /**
   * Create a dummy file to ensure the root directory exists
   * otherwise Vite will throw an error
   */
  await test.context.fs.create('dummy.txt', 'dummy')

  const vite = new Vite(true, config)

  await vite.createDevServer({
    logLevel: 'silent',
    clearScreen: false,
    root: test.context.fs.basePath,
    ...viteConfig,
  })

  test.cleanup(() => vite.stopDevServer())

  return vite
}
