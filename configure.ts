/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  await command.publishStub('config.stub')
  await command.publishStub('client_config.stub')
  await command.publishStub('js_entrypoint.stub')

  await command.updateRcFile((rcFile) => {
    rcFile.addProvider('@adonisjs/vite/vite_provider')
  })

  if (await command.prompt.confirm('Do you want to install "vite"?')) {
    await command.installPackages([{ name: 'vite', isDevDependency: true }])
  }
}
