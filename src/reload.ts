import { Plugin, ViteDevServer } from 'vite'
import { PluginFullOptions } from './contracts'

/**
 * Basically for now, it just reload the page when a edge file changes
 */
const watcherListener = (options: PluginFullOptions, server: ViteDevServer, path: string) => {
  if (options.reloadOnEdgeChanges && path.endsWith('.edge')) {
    server.ws.send({ type: 'full-reload' })
  }
}

const configureServerHook = (options: PluginFullOptions, server: ViteDevServer) => {
  const listener = watcherListener.bind(null, options, server)
  server.watcher.on('change', listener).on('add', listener).on('unlink', listener)
}

/**
 * Full reload when an edge file has been changed
 */
export const reload = (options: PluginFullOptions): Plugin => {
  return {
    name: 'vite-plugin-adonis:reload',
    configureServer: (server) => configureServerHook(options, server),
  }
}
