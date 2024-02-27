/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { multibuild } from '@vavite/multibuild'
import type { AssemblerHookHandler } from '@adonisjs/core/types/app'

/**
 * This is an Assembler hook that should be executed when the application is
 * builded using the `node ace build` command.
 *
 * The hook is responsible for launching a Vite multi-build process.
 */
export default async function viteBuildHook({ logger }: Parameters<AssemblerHookHandler>[0]) {
  logger.info('building assets with vite')

  await multibuild(undefined, {
    onStartBuildStep: (step) => {
      if (!step.currentStep.description) return

      logger.info(step.currentStep.description)
    },
  })
}
