/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type Configure from '@adonisjs/core/commands/configure'

import { stubsRoot } from './stubs/main.js'

/**
 * Configures the package
 */
export async function configure(command: Configure) {
  const codemods = await command.createCodemods()
  let shouldInstallPackages: boolean | undefined = command.parsedFlags.install

  /**
   * Publish stubs
   */
  await codemods.makeUsingStub(stubsRoot, 'config/vite.stub', {})
  await codemods.makeUsingStub(stubsRoot, 'vite.config.stub', {})
  await codemods.makeUsingStub(stubsRoot, 'js_entrypoint.stub', {})

  await codemods.updateRcFile((rcFile) => {
    rcFile.addProvider('@adonisjs/vite/vite_provider')
    rcFile.addMetaFile('public/**', false)
  })

  /**
   * Prompt when `install` or `--no-install` flags are
   * not used
   */
  if (shouldInstallPackages === undefined) {
    shouldInstallPackages = await command.prompt.confirm('Do you want to install "vite"?')
  }

  /**
   * Install dependency or list the command to install it
   */
  if (shouldInstallPackages) {
    await codemods.installPackages([{ name: 'vite', isDevDependency: true }])
  } else {
    await codemods.listPackagesToInstall([{ name: 'vite', isDevDependency: true }])
  }
}
