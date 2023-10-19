/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { IgnitorFactory } from '@adonisjs/core/factories'
import Configure from '@adonisjs/core/commands/configure'

import { BASE_URL } from '../tests_helpers/index.js'

test.group('Configure', () => {
  test('create config file and register provider', async ({ assert, fs }) => {
    const ignitor = new IgnitorFactory()
      .withCoreProviders()
      .withCoreConfig()
      .create(BASE_URL, {
        importer: (filePath) => {
          if (filePath.startsWith('./') || filePath.startsWith('../')) {
            return import(new URL(filePath, BASE_URL).href)
          }

          return import(filePath)
        },
      })

    await fs.create('.env', '')
    await fs.createJson('tsconfig.json', {})
    await fs.create('adonisrc.ts', `export default defineConfig({})`)

    const app = ignitor.createApp('web')
    await app.init()
    await app.boot()

    const ace = await app.container.make('ace')
    const command = await ace.create(Configure, ['../../index.js'])
    command.ui.switchMode('raw')
    command.prompt.trap('Do you want to install "vite"?').reject()

    await command.exec()

    await assert.fileExists('vite.config.js')
    await assert.fileExists('resources/js/app.js')
    await assert.fileContains('adonisrc.ts', '@adonisjs/vite/vite_provider')
    await assert.fileContains('vite.config.js', `import adonisjs from '@adonisjs/vite/client'`)
    await assert.fileContains('adonisrc.ts', `pattern: 'public/**'`)
    await assert.fileContains('adonisrc.ts', `reloadServer: false`)
  }).timeout(60 * 1000)
})
