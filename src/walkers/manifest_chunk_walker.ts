/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { TagBuilder } from '../tag_builder.ts'
import type { ManifestLoader } from '../manifest_loader.ts'
import type { BuildAssetUrlBuilder } from '../url_builders/build_asset_url_builder.ts'
import type { EntrypointWalker, ResolvedEntrypoint, ResolvedTag } from '../types.ts'

/**
 * Walks the Vite manifest for a set of entrypoints and produces the
 * scripts, styles and preloads needed in the rendered HTML.
 *
 * Reference manifest shape (the structure we walk):
 *
 * {
 *   "resources/app.ts": {                       // ← an entrypoint chunk
 *     "file": "assets/app-AbCd1234.js",         //   compiled entry file
 *     "src":  "resources/app.ts",
 *     "isEntry": true,
 *     "integrity": "sha384-…",
 *     "css":  ["assets/app-Ee5678.css"],        //   CSS imported directly
 *     "imports": [                              //   static imports of this entry
 *       "_shared-XyZ.js",
 *       "_vendor-Q3.js"
 *     ]
 *   },
 *   "_shared-XyZ.js": {                         // ← imported (non-entry) chunk
 *     "file": "assets/shared-XyZ.js",
 *     "css":  ["assets/shared-Pp9012.css"]      //   CSS pulled in via this import
 *   },
 *   "_vendor-Q3.js": {
 *     "file": "assets/vendor-Q3.js"
 *   }
 * }
 *
 * For each entrypoint we emit, in order:
 *   1. The entrypoint script + its modulepreload                  → uses chunk.file
 *   2. The entrypoint's CSS files (style tag + preload)           → uses chunk.css
 *   3. A modulepreload for every static import of the entrypoint  → uses chunk.imports
 *   4. Tags + preloads for the CSS files transitively imported    → uses manifest[import].css
 */
export class ManifestChunkWalker implements EntrypointWalker {
  #manifestLoader: ManifestLoader
  #urlBuilder: BuildAssetUrlBuilder
  #tagBuilder: TagBuilder

  constructor(
    manifestLoader: ManifestLoader,
    urlBuilder: BuildAssetUrlBuilder,
    tagBuilder: TagBuilder
  ) {
    this.#manifestLoader = manifestLoader
    this.#urlBuilder = urlBuilder
    this.#tagBuilder = tagBuilder
  }

  walk(entries: string[]): ResolvedEntrypoint {
    const manifest = this.#manifestLoader.load()
    const tags: ResolvedTag[] = []
    const preloads: ResolvedEntrypoint['preloads'] = []

    for (const entry of entries) {
      const chunk = this.#manifestLoader.getChunk(entry)
      const entryUrl = this.#urlBuilder.prefix(chunk.file)

      /**
       * (1) Entrypoint tag + its preload. The tag is a style or script
       *     based on the compiled output file extension (a CSS-only
       *     entrypoint compiles to a .css file).
       */
      const entryIsStyle = this.#tagBuilder.isCssPath(chunk.file)
      preloads.push({
        href: entryUrl,
        kind: entryIsStyle ? 'style' : 'modulepreload',
      })
      tags.push(
        entryIsStyle
          ? { kind: 'style', assetPath: chunk.file, url: entryUrl, integrity: chunk.integrity }
          : { kind: 'script', assetPath: chunk.file, url: entryUrl, integrity: chunk.integrity }
      )

      /**
       * (2) CSS imported directly by the entrypoint
       */
      for (const css of chunk.css || []) {
        const cssUrl = this.#urlBuilder.prefix(css)
        preloads.push({ href: cssUrl, kind: 'style' })
        tags.push({ kind: 'style', assetPath: css, url: cssUrl })
      }

      /**
       * (3) Static imports of the entrypoint — preload only, no script tag
       *     (4) For each imported chunk, emit tags + preloads for its CSS
       */
      for (const importNode of chunk.imports || []) {
        const importedChunk = manifest[importNode]
        preloads.push({
          href: this.#urlBuilder.prefix(importedChunk.file),
          kind: 'modulepreload',
        })

        for (const css of importedChunk.css || []) {
          const cssUrl = this.#urlBuilder.prefix(css)
          const subChunk = this.#manifestLoader.chunksByFile(css)
          preloads.push({ href: cssUrl, kind: 'style' })
          tags.push({
            kind: 'style',
            assetPath: css,
            url: cssUrl,
            integrity: subChunk[0]?.integrity,
          })
        }
      }
    }

    return { tags, preloads }
  }
}
