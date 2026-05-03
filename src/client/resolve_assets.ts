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
import { readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, isAbsolute, join, normalize, resolve } from 'node:path'
import type { PluginOptions } from './types.ts'

const GLOB_CHARS_REGEX = /[*?{}[\]]/

/**
 * Returns a pair of plugins that:
 *
 * 1. Emits user-supplied files into the build output. `chunks` are passed to
 *    Vite's `emitFile({ type: 'chunk' })` after glob expansion. `assets` are
 *    emitted as raw `type: 'asset'` files (no glob expansion — exact paths
 *    only) so the original filename hashing applies but the source content
 *    is preserved verbatim.
 * 2. Rewrites the manifest after Vite writes it so that emitted asset
 *    entries are keyed by their original source path (instead of Vite's
 *    synthetic `_<hash>.<ext>` key). Lets templates resolve assets via
 *    `vite.assetPath('resources/images/logo.png')`.
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

  const assetRefToSource = new Map<string, string>()
  const toAbsolute = (file: string) => (isAbsolute(file) ? file : resolve(root, file))

  let manifestFileName = '.vite/manifest.json'
  let manifestEnabled = true
  let root = process.cwd()

  return [
    {
      name: 'adonisjs:resolve-assets',
      apply: 'build',
      configResolved(config) {
        root = config.root
      },
      buildStart() {
        const chunkPatterns = chunks.map(toAbsolute)
        for (const file of globSync(chunkPatterns)) {
          if (statSync(file).isFile()) {
            this.emitFile({ type: 'chunk', id: file })
          }
        }

        for (const file of assets) {
          const absolute = toAbsolute(file)
          const refId = this.emitFile({
            type: 'asset',
            name: basename(file),
            source: readFileSync(absolute),
          })
          assetRefToSource.set(refId, normalize(file))
        }
      },
    },
    {
      name: 'adonisjs:resolve-assets:manifest',
      apply: 'build',
      enforce: 'post',
      configResolved(config) {
        const manifest = config.build.manifest
        manifestEnabled = manifest !== false
        manifestFileName = typeof manifest === 'string' ? manifest : '.vite/manifest.json'
      },
      writeBundle(options) {
        if (!manifestEnabled || assetRefToSource.size === 0 || !options.dir) {
          return
        }

        const manifestPath = join(options.dir, manifestFileName)
        const manifestData = JSON.parse(readFileSync(manifestPath, 'utf-8'))

        for (const [refId, sourcePath] of assetRefToSource) {
          const outputFileName = this.getFileName(refId)

          /**
           * Vite keys emitted assets with their hashed filename prefixed by
           * an underscore. Find that synthetic key, copy its entry under
           * the source path, then drop the synthetic one.
           */
          const wrongKey = Object.keys(manifestData).find(
            (key) => manifestData[key].file === outputFileName
          )

          if (wrongKey) {
            manifestData[sourcePath] = {
              ...manifestData[wrongKey],
              file: outputFileName,
              src: sourcePath,
            }
            delete manifestData[wrongKey]
          }
        }

        writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2))

        /**
         * Reset state so a subsequent build (e.g. via createBuilder running
         * multiple environments) starts clean.
         */
        assetRefToSource.clear()
      },
    },
  ]
}
