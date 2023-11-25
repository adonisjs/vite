/*
 * @next-edge/adonisjs-v5-vite
 *
 * TODO: write tests
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

//import { IgnitorFactory } from '@adonisjs/core/factories'

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const BASE_URL = new URL('../tests/__app/', import.meta.url)

/*
export async function setupApp(
  environment: 'web' | 'repl',
  additionalConfig: Record<string, any> = {}
) {
  const IMPORTER = (filePath: string) => {
    if (filePath.startsWith('./') || filePath.startsWith('../')) {
      return import(new URL(filePath, BASE_URL).href)
    }
    return import(filePath)
  }

  const ignitor = new IgnitorFactory()
    .merge({
      rcFileContents: {
        providers: ['@adonisjs/view/views_provider', '../../providers/vite_provider.js'],
      },
    })
    .withCoreConfig()
    .withCoreProviders()
    .merge({ config: { views: { cache: false } } })
    .merge({ config: additionalConfig })
    .create(BASE_URL, { importer: IMPORTER })

  const app = ignitor.createApp(environment)

  await app.init()
  await app.boot()

  return { app, ignitor }
}
*/
