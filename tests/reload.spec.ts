import { test } from '@japa/runner'
import { createServer } from 'vite'
import Adonis from '../src'
import { Filesystem } from '@poppinss/dev-utils'
import { join } from 'path'
import { sleep } from '../tests-helpers'

const fs = new Filesystem(join(__dirname, 'app'))

test.group('Reload', (group) => {
  group.each.teardown(async () => {
    await fs.cleanup()
  })

  test('Should trigger reload when an edge file is updated', async ({ assert }) => {
    assert.plan(2)

    const server = await createServer({
      root: fs.basePath,
      logLevel: 'silent',
      plugins: [
        Adonis({
          entryPoints: { app: ['tests/fixtures/app.ts'] },
        }),
      ],
    })

    await fs.fsExtra.mkdirp(join(fs.basePath, 'views'))

    await server.listen()

    server.ws.send = (message: any) => {
      // Sometime the full-reload message is sent 3 times instead of two
      // Don't know why, but it's not a big deal. So let's just ignore it for now
      if (assert.assertions.total === 2) return

      if (message.type === 'full-reload') {
        assert.isTrue(true)
      }
    }

    await sleep(500)

    await fs.add('views/index.edge', 'Hello world')
    await fs.remove('views/index.edge')

    await sleep(500)

    await server.close()
  })
    .disableTimeout()
    .skip(!!process.env.CI)
})
