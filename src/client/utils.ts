/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import { ResolvedConfig } from 'vite'
import { AddressInfo } from 'node:net'

/**
 * Resolve the dev server URL from the server address and configuration.
 */
export const resolveDevServerUrl = (address: AddressInfo, config: ResolvedConfig) => {
  const configHmrProtocol =
    typeof config.server.hmr === 'object' ? config.server.hmr.protocol : null

  const clientProtocol = configHmrProtocol ? (configHmrProtocol === 'wss' ? 'https' : 'http') : null
  const serverProtocol = config.server.https ? 'https' : 'http'
  const protocol = clientProtocol ?? serverProtocol

  const configHmrHost = typeof config.server.hmr === 'object' ? config.server.hmr.host : null
  const configHost = typeof config.server.host === 'string' ? config.server.host : null

  let host = configHmrHost ?? configHost ?? address.address
  if (host === '::1') {
    host = 'localhost'
  }

  return `${protocol}://${host}:${address.port}`
}

/**
 * Add a trailing slash if missing
 */
export const addTrailingSlash = (url: string) => {
  return url.endsWith('/') ? url : url + '/'
}
