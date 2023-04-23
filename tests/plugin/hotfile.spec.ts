/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { createServer } from 'vite'
import Adonis from '../../src/vite_plugin/index.js'
import { sleep } from '../../tests_helpers/index.js'

async function setupEntrypoint(fs: any) {
  await fs.create('resources/js/app.ts', 'console.log("hello")')
}

test.group('Hotfile', () => {
  test('Should create hotfile with dev server url', async ({ assert, fs }) => {
    await setupEntrypoint(fs)

    const server = await createServer({
      root: fs.basePath,
      logLevel: 'warn',
      plugins: [Adonis({ entrypoints: ['resources/js/app.ts'] })],
    })

    await server.listen(9484)
    await sleep(100)

    const hotContent = await fs.contents('public/assets/hot.json')
    assert.deepEqual(JSON.parse(hotContent), { url: 'http://localhost:9484' })

    await server.close()
  })

  test('should clean hotfile on exit', async ({ assert, fs }) => {
    await setupEntrypoint(fs)

    const server = await createServer({
      root: fs.basePath,
      logLevel: 'warn',
      plugins: [Adonis({ entrypoints: ['resources/js/app.ts'] })],
    })

    await server.listen(9484)
    await sleep(100)

    assert.isTrue(await fs.exists('public/assets/hot.json'))

    await server.close()

    assert.isFalse(await fs.exists('public/assets/hot.json'))
  })

  test('should be able to customize the hotfile path', async ({ assert, fs }) => {
    await setupEntrypoint(fs)

    const server = await createServer({
      root: fs.basePath,
      logLevel: 'warn',
      plugins: [Adonis({ entrypoints: ['resources/js/app.ts'], hotFile: 'directory/custom.json' })],
    })

    await server.listen(9484)
    await sleep(100)

    assert.isTrue(await fs.exists('directory/custom.json'))

    await server.close()
  })
})
