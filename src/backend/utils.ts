/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Returns a new array with unique items by the given key
 */
export function uniqBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set()
  return array.filter((item) => {
    const k = item[key]
    return seen.has(k) ? false : seen.add(k)
  })
}

/**
 * Convert Record of attributes to a valid HTML string
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
