/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { join } from 'node:path'
import { test } from '@japa/runner'
import { defineConfig } from '../../index.ts'

test.group('Define config', () => {
  test('merge defaults with user provided config', ({ assert }) => {
    assert.deepEqual(defineConfig({}), {
      buildDirectory: 'public/assets',
      assetsUrl: '/assets',
      manifestFile: 'public/assets/.vite/manifest.json',
      serverBuildDirectory: join('public/assets', 'server'),
    })
  })

  test('derive serverBuildDirectory from a custom buildDirectory', ({ assert }) => {
    assert.equal(
      defineConfig({ buildDirectory: 'dist' }).serverBuildDirectory,
      join('dist', 'server')
    )
  })

  test('keep a user provided serverBuildDirectory', ({ assert }) => {
    assert.equal(
      defineConfig({ serverBuildDirectory: 'build/ssr' }).serverBuildDirectory,
      'build/ssr'
    )
  })
})
