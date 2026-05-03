/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'

import { createVite } from './helpers.ts'
import { defineConfig } from '../../src/define_config.ts'

test.group('Vite module runner', () => {
  test('createModuleRunner returns a runner with import method', async ({ assert, cleanup }) => {
    const vite = await createVite(defineConfig({}))
    const runner = await vite.createModuleRunner()
    cleanup(() => runner.close())

    assert.exists(runner)
    assert.isFunction(runner.import)
  })

  test('runner.import loads a fixture module from the SSR environment', async ({
    fs,
    assert,
    cleanup,
  }) => {
    await fs.create('app.ts', `export default 'ok'\nexport const value = 42`)

    const vite = await createVite(defineConfig({}))
    const runner = await vite.createModuleRunner()
    cleanup(() => runner.close())

    const mod = await runner.import('/app.ts')
    assert.equal(mod.default, 'ok')
    assert.equal(mod.value, 42)
  })

  test('vite/module-runner subpath export resolves', async ({ assert }) => {
    /**
     * If Vite 8 ever drops the `vite/module-runner` subpath, this import
     * will fail at module load time. The assertion is a smoke check that
     * the subpath continues to expose ModuleRunner.
     */
    const mod = await import('vite/module-runner')
    assert.exists(mod.ModuleRunner)
  })

  test('runner can re-import a module after edit', async ({ fs, assert, cleanup }) => {
    await fs.create('counter.ts', `export const count = 1`)

    const vite = await createVite(defineConfig({}))
    const runner = await vite.createModuleRunner()
    cleanup(() => runner.close())

    const first = await runner.import('/counter.ts')
    assert.equal(first.count, 1)
  })
})
