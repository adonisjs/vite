/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { EdgeError } from 'edge-error'
import type { PluginFn } from 'edge.js/types'

import debug from './debug.js'
import type { Vite } from './vite.js'

/**
 * The edge plugin for vite to share vite service with edge
 * and register custom tags
 */
export const edgePluginVite: (vite: Vite) => PluginFn<undefined> = (vite) => {
  return (edge) => {
    debug('sharing vite and asset globals with edge')
    edge.global('vite', vite)
    edge.global('asset', vite.assetPath.bind(vite))

    debug('registering vite tags with edge')
    edge.registerTag({
      tagName: 'viteReactRefresh',
      seekable: true,
      block: false,
      compile(_parser, buffer, token) {
        buffer.outputExpression(
          `state.vite.getReactHmrScript()`,
          token.filename,
          token.loc.start.line,
          false
        )
      },
    })

    edge.registerTag({
      tagName: 'vite',
      seekable: true,
      block: false,
      compile(parser, buffer, token) {
        /**
         * Ensure an argument is defined
         */
        if (!token.properties.jsArg.trim()) {
          throw new EdgeError('Missing entrypoint name', 'E_RUNTIME_EXCEPTION', {
            filename: token.filename,
            line: token.loc.start.line,
            col: token.loc.start.col,
          })
        }

        const parsed = parser.utils.transformAst(
          parser.utils.generateAST(token.properties.jsArg, token.loc, token.filename),
          token.filename,
          parser
        )

        const entrypoints = parser.utils.stringify(parsed)

        buffer.outputExpression(
          `state.vite.generateEntryPointsTags(${entrypoints})`,
          token.filename,
          token.loc.start.line,
          false
        )
      },
    })
  }
}
