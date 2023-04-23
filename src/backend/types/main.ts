/*
 * @adonisjs/vite
 *
 * (c) AdonisJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/**
 * Content of the hotfile
 */
export type HotFile = {
  url: string
}

/**
 * Parameters passed to the setAttributes callback
 */
export type SetAttributesCallbackParams = {
  src: string
  url: string
}

/**
 * Attributes to be set on the script/style tags.
 * Can be either a record or a callback that returns a record.
 */
export type SetAttributes =
  | Record<string, string | boolean>
  | ((params: SetAttributesCallbackParams) => Record<string, string | boolean>)
