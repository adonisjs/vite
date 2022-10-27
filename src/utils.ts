import { AddressInfo } from 'node:net'
import { InternalModuleFormat, OutputChunk } from 'rollup'
import { ResolvedConfig } from 'vite'
import path from 'node:path'
import os from 'node:os'

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
 * Is the current platform Windows?
 */
export const isWindows = os.platform() === 'win32'

/**
 * Replace backslashes with forward slashes.
 */
export function slash(p: string): string {
  return p.replace(/\\/g, '/')
}

/**
 * Normalize a path and use forward slashes.
 */
export function normalizePath(id: string): string {
  return path.posix.normalize(isWindows ? slash(id) : id)
}

/**
 * Get a chunk's original file name instead of the hashed name.
 */
export const getChunkName = (
  format: InternalModuleFormat,
  chunk: OutputChunk,
  config: ResolvedConfig
) => {
  if (chunk.facadeModuleId) {
    let name = normalizePath(path.relative(config.root, chunk.facadeModuleId))
    if (format === 'system' && !chunk.name.includes('-legacy')) {
      const ext = path.extname(name)
      const endPos = ext.length !== 0 ? -ext.length : undefined
      name = name.slice(0, endPos) + `-legacy` + ext
    }
    return name.replace(/\0/g, '')
  } else {
    return `_` + path.basename(chunk.fileName)
  }
}
