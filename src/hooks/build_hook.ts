/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { hooks } from '@adonisjs/core/app'
import { createBuilder } from 'vite'

/**
 * This is an Assembler hook that should be executed when the application is
 * builded using the `node ace build` command.
 *
 * The hook is responsible for launching a Vite multi-build process.
 */
export default hooks.buildStarting(async (parent) => {
  parent.ui.logger.info('building assets with vite')
  const builder = await createBuilder({}, null)
  await builder.buildApp()
})
