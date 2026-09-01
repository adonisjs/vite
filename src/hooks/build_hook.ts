/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { Bundler } from '@adonisjs/assembler'
import { hooks } from '@adonisjs/core/app'
import { createBuilder } from 'vite'

/**
 * This is an Assembler hook that should be executed when the application is
 * builded using the `node ace build` command.
 *
 * The hook is responsible for launching a Vite multi-build process.
 */
export default hooks.buildStarting(async (parent: Bundler) => {
  /**
   * Vite's CLI sets NODE_ENV to 'production' automatically when running
   * `vite build`, but the programmatic `createBuilder` API does not.
   * Without this, framework plugins (React, Vue, MDX, …) emit dev-only
   * code paths in the production bundle.
   *
   * See https://github.com/remix-run/remix/issues/4081
   */
  process.env.NODE_ENV = 'production'

  parent.ui.logger.info('building assets with vite')

  /**
   * Force multi-environment builder mode (`useLegacyBuilder = false`).
   * Vite's default builder builds every declared environment when no
   * plugin contributes a custom `buildApp`, which is what we want for
   * apps that declare both client `entryPoints` and `serverEntryPoints`.
   */
  const builder = await createBuilder({}, false)
  await builder.buildApp()
})
