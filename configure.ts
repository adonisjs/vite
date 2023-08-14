/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type Configure from '@adonisjs/core/commands/configure'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  const stubDestination = join(fileURLToPath(command.app.appRoot), 'vite.config.js')

  await command.publishStub('client_config.stub', {
    destination: stubDestination,
  })
  await command.publishStub('config.stub')

  await command.updateRcFile((rcFile) => {
    rcFile.addProvider('@adonisjs/vite/vite_provider')
  })

  await command.installPackages([{ name: 'vite', isDevDependency: true }])
}
