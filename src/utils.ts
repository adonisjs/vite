import { AddressInfo } from 'node:net'
import { ResolvedConfig } from 'vite'

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
  const serverAddress = address.family === 'IPv6' ? `[${address.address}]` : address.address
  let host = configHmrHost ?? configHost ?? serverAddress
  if (host === '::1') {
    host = 'localhost'
  }

  return `${protocol}://${host}:${address.port}`
}
