/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import app from '@adonisjs/core/services/app'
import { Vite } from '../index.js'

let vite: Vite

/**
 * Returns a singleton instance of Vite class
 * from the container
 */
await app.booted(async () => {
  vite = await app.container.make('vite')
})

export { vite as default }
