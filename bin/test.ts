import { assert } from '@japa/assert'
import { fileSystem } from '@japa/file-system'
import { expectTypeOf } from '@japa/expect-type'
import { processCLIArgs, configure, run } from '@japa/runner'
import { BASE_URL } from '../tests_helpers/index.js'

processCLIArgs(process.argv.slice(2))
configure({
  files: ['tests/**/*.spec.ts'],
  plugins: [
    assert(),
    fileSystem({
      autoClean: true,
      basePath: BASE_URL,
    }),
    expectTypeOf(),
  ],
})

run()
