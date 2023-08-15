/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Resolves a page component.
 */
export async function resolvePageComponent(name: string, pages: Record<string, any>) {
  const path = Object.keys(pages)
    .sort((a, b) => a.length - b.length)
    .find((filepath) => filepath.endsWith(name))

  if (!path) {
    throw new Error(`Page component "${name}" could not be found.`)
  }

  let component = typeof pages[path] === 'function' ? await pages[path]() : pages[path]

  component = component.default ?? component

  return component
}
