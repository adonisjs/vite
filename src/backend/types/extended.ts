/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { Vite } from '../vite.js'

/**
 * Extend the container bindings
 */
declare module '@adonisjs/core/types' {
  interface ContainerBindings {
    vite: Vite
  }
}
