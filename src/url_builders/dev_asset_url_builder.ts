/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { AssetUrlBuilder } from '../types.ts'

/**
 * Resolves asset URLs against the Vite dev server. Assets are served
 * unchanged at their root-relative path.
 */
export class DevAssetUrlBuilder implements AssetUrlBuilder {
  urlFor(asset: string): string {
    return `/${asset}`
  }
}
