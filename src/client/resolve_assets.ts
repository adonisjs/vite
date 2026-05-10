/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Plugin } from 'vite'
import { globSync } from 'tinyglobby'
import { readFileSync, statSync } from 'node:fs'
import { basename, isAbsolute, resolve } from 'node:path'

import type { PluginOptions } from './types.ts'

const GLOB_CHARS_REGEX = /[*?{}[\]]/

/**
 * Returns a plugin that emits user-supplied files into the build output.
 *
 * `chunks` are passed to Vite's `emitFile({ type: 'chunk' })` after glob
 * expansion. They are processed by the bundler and surface in the manifest
 * with hashed filenames.
 *
 * `assets` are emitted as raw `type: 'asset'` files (no glob expansion —
 * exact paths only) so the original source content is preserved verbatim.
 * The `originalFileName` field tells Vite to use the source path as the
 * manifest key, so templates can resolve them via
 * `vite.assetPath('resources/images/logo.png')` without any post-build
 * manifest rewriting.
 *
 * Returns an empty array (no-op) when neither chunks nor assets are
 * configured.
 */
export function resolveAssets(input: PluginOptions['assets']): Plugin[] {
  const chunks = Array.isArray(input) ? input : (input?.chunks ?? [])
  const assets = Array.isArray(input) ? [] : (input?.assets ?? [])

  if (chunks.length === 0 && assets.length === 0) {
    return []
  }

  for (const asset of assets) {
    if (GLOB_CHARS_REGEX.test(asset)) {
      throw new Error(
        `Assets do not support glob patterns. Received "${asset}". Provide an exact file path instead.`
      )
    }
  }

  let root = process.cwd()

  return [
    {
      name: 'adonisjs:resolve-assets',
      apply: 'build',
      configResolved(config) {
        root = config.root
      },
      buildStart() {
        for (const file of globSync(chunks, { cwd: root, absolute: true })) {
          if (statSync(file).isFile()) {
            this.emitFile({ type: 'chunk', id: file })
          }
        }

        for (const file of assets) {
          const absolute = isAbsolute(file) ? file : resolve(root, file)
          this.emitFile({
            type: 'asset',
            name: basename(file),
            originalFileName: file,
            source: readFileSync(absolute),
          })
        }
      },
    },
  ]
}
