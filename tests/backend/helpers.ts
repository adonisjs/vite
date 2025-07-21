/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { getActiveTest } from '@japa/runner'

import { defineConfig, Vite } from '../../index.js'
import { ViteOptions } from '../../src/types.js'
import { InlineConfig } from 'vite'
import { join } from 'node:path'

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

  const vite = new Vite(config)
  await vite.createDevServer({
    logLevel: 'silent',
    clearScreen: false,
    root: test.context.fs.basePath,
    ...viteConfig,
  })

  test.cleanup(() => vite.stopDevServer())

  return vite
}

export async function setupViteWithManifest(config?: Partial<ViteOptions>) {
  const test = getActiveTest()
  if (!test) throw new Error('Cannot create vite instance outside of a test')

  await test.context.fs.create('public/assets/.vite/manifest.json', '')

  const defaultManifestPath = join(test.context.fs.basePath, 'public/assets/.vite/manifest.json')
  const vite = new Vite(defineConfig(config || { manifestFile: defaultManifestPath }))

  return vite
}
