/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { test } from '@japa/runner'
import { defineConfig } from '../../index.js'

test.group('Define config', () => {
  test('merge defaults with user provided config', ({ assert }) => {
    assert.deepEqual(defineConfig({}), {
      buildDirectory: 'public/assets',
      assetsUrl: '/assets',
      hotFile: 'public/assets/hot.json',
      manifestFile: 'public/assets/.vite/manifest.json',
    })
  })
})
