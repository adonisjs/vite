/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import '@adonisjs/view'
import { ApplicationService } from '@adonisjs/core/types'
import { ViewContract } from '@adonisjs/view/types'
import { Vite } from '../src/backend/vite.js'
import { EdgeError } from 'edge-error'

export default class ViteServiceProvider {
  constructor(protected app: ApplicationService) {}

  /**
   * Inject the script needed for Vite HMR
   */
  #registerViteTag(view: ViewContract) {
    view.registerTag({
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

  /**
   * Inject a script needed for the HMR working with React
   */
  #registerViteReactTag(view: ViewContract) {
    view.registerTag({
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
  }

  register() {
    this.app.container.singleton('vite', async () => new Vite(this.app))
  }

  async boot() {
    const view = await this.app.container.make('view')
    const vite = await this.app.container.make('vite')

    view.global('vite', vite)
    view.global('asset', vite.assetPath.bind(vite))

    this.#registerViteTag(view)
    this.#registerViteReactTag(view)
  }
}
