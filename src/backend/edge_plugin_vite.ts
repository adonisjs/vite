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
      compile(parser, buffer, token) {
        let attributes = ''
        if (token.properties.jsArg.trim()) {
          /**
           * Converting a single argument to a SequenceExpression so that we
           * work around the following edge cases.
           *
           * - If someone passes an object literal to the tag, ie { nonce: 'foo' }
           *   it will be parsed as a LabeledStatement and not an object.
           * - If we wrap the object literal inside parenthesis, ie ({nonce: 'foo'})
           *   then we will end up messing other expressions like a variable reference
           *   , or a member expression and so on.
           * - So the best bet is to convert user supplied argument to a sequence expression
           *   and hence ignore it during stringification.
           */
          const jsArg = `a,${token.properties.jsArg}`

          const parsed = parser.utils.transformAst(
            parser.utils.generateAST(jsArg, token.loc, token.filename),
            token.filename,
            parser
          )
          attributes = parser.utils.stringify(parsed.expressions[1])
        }

        /**
         * Get HMR script
         */
        buffer.writeExpression(
          `const __vite_hmr_script = state.vite.getReactHmrScript(${attributes})`,
          token.filename,
          token.loc.start.line
        )

        /**
         * Check if the script exists (only in hot mode)
         */
        buffer.writeStatement('if(__vite_hmr_script) {', token.filename, token.loc.start.line)

        /**
         * Write output
         */
        buffer.outputExpression(
          `__vite_hmr_script.toString()`,
          token.filename,
          token.loc.start.line,
          false
        )

        /**
         * Close if block
         */
        buffer.writeStatement('}', token.filename, token.loc.start.line)
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
        const methodCall =
          parsed.type === 'SequenceExpression'
            ? `generateEntryPointsTags${entrypoints}`
            : `generateEntryPointsTags(${entrypoints})`

        buffer.outputExpression(
          `state.vite.${methodCall}.join('\\n')`,
          token.filename,
          token.loc.start.line,
          false
        )
      },
    })
  }
}
