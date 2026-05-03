/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import path from 'node:path'
import picomatch from 'picomatch'
import type { Plugin } from 'vite'

export interface ReloadOptions {
  delay?: number
}

/**
 * Compute the longest leading directory of a glob (everything up to the first
 * segment containing a glob char). Returns the glob unchanged when no glob
 * chars are present.
 */
function baseDir(glob: string): string {
  const match = glob.search(/[*?[{]/)
  if (match === -1) {
    return glob
  }

  const slash = glob.lastIndexOf('/', match)
  return slash === -1 ? '.' : glob.slice(0, slash)
}

/**
 * Returns a Vite plugin that triggers a full browser reload whenever any file
 * matching the supplied glob patterns changes. Patterns are resolved relative
 * to the Vite project root.
 *
 * Replaces the previous `vite-plugin-restart` dependency. Only the reload
 * (browser refresh) feature is implemented — server restart is not.
 */
export function reload(patterns: string | string[], options: ReloadOptions = {}): Plugin {
  const delay = options.delay ?? 100
  const patternList = Array.isArray(patterns) ? patterns : [patterns]
  let timer: NodeJS.Timeout | undefined

  return {
    name: 'adonisjs:reload',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root
      const absolutePatterns = patternList.map((pattern) => path.posix.join(root, pattern))
      const isMatch = picomatch(absolutePatterns)

      /**
       * Watch the longest non-glob prefix of each pattern so newly created
       * files inside watched directories are picked up.
       */
      const baseDirs = absolutePatterns.map(baseDir)
      server.watcher.add(baseDirs)

      const trigger = (file: string) => {
        if (!isMatch(file)) {
          return
        }

        if (timer) {
          clearTimeout(timer)
        }

        timer = setTimeout(() => {
          server.ws.send({ type: 'full-reload', path: '*' })
          timer = undefined
        }, delay)
      }

      server.watcher.on('add', trigger)
      server.watcher.on('change', trigger)
      server.watcher.on('unlink', trigger)
    },
  }
}
