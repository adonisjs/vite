/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Returns a new array with unique items filtered by the specified key
 * 
 * @param array - The array to filter for unique items
 * @param key - The key to use for uniqueness comparison
 * 
 * @example
 * const users = [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }, { id: 1, name: 'John' }]
 * const unique = uniqBy(users, 'id')
 * // Returns: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }]
 */
export function uniqBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set()
  return array.filter((item) => {
    const k = item[key]
    return seen.has(k) ? false : seen.add(k)
  })
}

/**
 * Converts an object of HTML attributes to a valid HTML attribute string
 * 
 * @param attributes - Object containing HTML attributes where values can be strings or booleans
 * 
 * @example
 * const attrs = makeAttributes({ class: 'btn', disabled: true, hidden: false })
 * // Returns: 'class="btn" disabled'
 */
export function makeAttributes(attributes: Record<string, string | boolean>) {
  return Object.keys(attributes)
    .map((key) => {
      const value = attributes[key]

      if (value === true) {
        return key
      }

      if (!value) {
        return null
      }

      return `${key}="${value}"`
    })
    .filter((attr) => attr !== null)
    .join(' ')
}

/**
 * Adds a trailing slash to a URL if it doesn't already have one
 * 
 * @param url - The URL string to process
 * 
 * @example
 * addTrailingSlash('/api') // Returns: '/api/'
 * addTrailingSlash('/api/') // Returns: '/api/'
 */
export const addTrailingSlash = (url: string) => {
  return url.endsWith('/') ? url : `${url}/`
}
