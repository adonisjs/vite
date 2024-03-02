/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { assert } from '@japa/assert'
import { snapshot } from '@japa/snapshot'
import { fileSystem } from '@japa/file-system'
import { processCLIArgs, configure, run } from '@japa/runner'

import { BASE_URL } from '../tests_helpers/index.js'

/*
|--------------------------------------------------------------------------
| Configure tests
|--------------------------------------------------------------------------
|
| The configure method accepts the configuration to configure the Japa
| tests runner.
|
| The first method call "processCLIArgs" process the command line arguments
| and turns them into a config object. Using this method is not mandatory.
|
| Please consult japa.dev/runner-config for the config docs.
*/
processCLIArgs(process.argv.slice(2))
configure({
  files: ['tests/**/*.spec.ts'],
  plugins: [assert(), fileSystem({ basePath: BASE_URL }), snapshot()],
})

/*
|--------------------------------------------------------------------------
| Run tests
|--------------------------------------------------------------------------
|
| The following "run" method is required to execute all the tests.
|
*/
run()
