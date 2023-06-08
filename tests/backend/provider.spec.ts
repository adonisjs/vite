import { test } from '@japa/runner'
import { setupApp } from '../../tests_helpers/index.js'
import { SetAttributesCallbackParams } from '../../src/backend/types/main.js'

test.group('Vite provider', () => {
  test('register vite service provider', async ({ assert }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    assert.exists(vite)
  })

  test('register vite and viteReactRefresh tags', async ({ assert }) => {
    const { app } = await setupApp('web')
    const view = await app.container.make('view')
    const tags = Object.keys(view.tags)

    assert.includeMembers(tags, ['vite', 'viteReactRefresh'])
  })

  test('register asset global helper to view', async ({ assert }) => {
    const { app } = await setupApp('web')
    const view = await app.container.make('view')

    assert.isFunction(view.GLOBALS['asset'])
  })

  test('should output @vite/client script', async ({ assert, fs }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    await fs.create('public/assets/hot.json', '{ "url": "http://localhost:9484" }')

    const output = vite.generateEntryPointsTags('test.js')
    assert.deepInclude(
      output,
      '<script type="module" src="http://localhost:9484/@vite/client"></script>'
    )
  })

  test("shouldn't output @vite/client script when hotfile is missing", async ({ assert, fs }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    await fs.create(
      'public/assets/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    const output = vite.generateEntryPointsTags('test.js')
    assert.notDeepInclude(output, '@vite/client')
  })

  test('should output script that redirect to dev server when hotfile is present', async ({
    assert,
    fs,
  }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    await fs.create('public/assets/hot.json', '{ "url": "http://localhost:9484" }')

    const output = vite.generateEntryPointsTags('test.js')
    assert.deepInclude(
      output,
      '<script type="module" src="http://localhost:9484/test.js"></script>'
    )
  })

  test('should output script that use manifest when hotfile is missing', async ({ assert, fs }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    await fs.create(
      'public/assets/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    const output = vite.generateEntryPointsTags('test.js')
    assert.deepInclude(output, '<script type="module" src="/assets/test-12345.js"></script>')
  })

  test('vite tag should use assetsUrl when provided', async ({ assert, fs }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    vite.setAssetsUrl('https://cdn.url.com')

    await fs.create(
      'public/assets/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    const output = vite.generateEntryPointsTags('test.js')

    assert.deepInclude(
      output,
      '<script type="module" src="https://cdn.url.com//assets/test-12345.js"></script>'
    )
  })

  test('hotfile path should be configurable', async ({ assert, fs }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    vite.setHotFilePath('hot.json')

    await fs.create('hot.json', '{ "url": "http://localhost:9484" }')

    assert.doesNotThrows(() => {
      vite.generateEntryPointsTags('test.js')
    })
  })

  test('raise exception when manifest is used in hot mode', async ({ fs, assert }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    await fs.create('public/assets/hot.json', '{ "url": "http://localhost:9484" }')

    assert.throws(() => {
      vite.manifest()
    }, 'Cannot read the manifest file when running in hot mode')
  })

  test('able to read manifest file', async ({ fs, assert }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    const manifest = {
      'test.js': { file: 'test-12345.js', src: 'test.js' },
    }

    await fs.create('public/assets/manifest.json', JSON.stringify(manifest))

    assert.deepEqual(vite.manifest(), manifest)
  })

  test('assetPath should return the correct path in hot mode', async ({ fs, assert }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    await fs.create('public/assets/hot.json', '{ "url": "http://localhost:9484" }')

    assert.equal(vite.assetPath('test.js'), 'http://localhost:9484/test.js')
  })

  test('assetPath should return the correct path in manifest mode', async ({ fs, assert }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    await fs.create(
      'public/assets/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    assert.equal(vite.assetPath('test.js'), '/assets/test-12345.js')
  })

  test('assetPath with custom assetsUrl should return the correct path', async ({ fs, assert }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    vite.setAssetsUrl('https://cdn.url.com')

    await fs.create(
      'public/assets/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    assert.equal(vite.assetPath('test.js'), 'https://cdn.url.com//assets/test-12345.js')
  })

  test('viteReactRefresh should output nothing when not in hot mode', async ({ assert }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    const output = vite.getReactHmrScript()
    assert.equal(output, '')
  })

  test('should add custom attributes on scripts', async ({ assert, fs }) => {
    const { app } = await setupApp('web')

    const vite = await app.container.make('vite')

    vite.setScriptAttributes({
      'data-test': 'test',
    })

    await fs.create(
      'public/assets/manifest.json',
      JSON.stringify({ 'test.js': { file: 'test-12345.js', src: 'test.js' } })
    )

    const output = vite.generateEntryPointsTags('test.js')

    assert.deepInclude(
      output,
      '<script type="module" data-test="test" src="/assets/test-12345.js"></script>'
    )
  })

  test('should add custom attributes on styles', async ({ assert, fs }) => {
    const { app } = await setupApp('web')

    const vite = await app.container.make('vite')

    vite.setStyleAttributes({ 'data-test': 'test', 'foo': false })

    await fs.create(
      'public/assets/manifest.json',
      JSON.stringify({ 'test.css': { file: 'test-12345.css', src: 'test.css' } })
    )

    const output = vite.generateEntryPointsTags('test.css')

    assert.deepInclude(
      output,
      '<link rel="stylesheet" data-test="test" href="/assets/test-12345.css">'
    )
  })

  test('custom attributes function should work', async ({ assert, fs }) => {
    const { app } = await setupApp('web')
    const vite = await app.container.make('vite')

    const calledWithArgs: SetAttributesCallbackParams[] = []
    vite.setScriptAttributes(({ src, url }) => {
      calledWithArgs.push({ src, url })
      if (src === 'test-3.js') return { 'data-test-3': '42' }

      return { 'data-test': src === 'test.js' ? 'test' : false } as Record<string, any>
    })

    await fs.create('public/assets/hot.json', '{ "url": "http://localhost:9484" }')
    const output = vite.generateEntryPointsTags(['test.js', 'test-2.js', 'test-3.js'])

    assert.deepEqual(calledWithArgs, [
      { src: 'test.js', url: 'http://localhost:9484/test.js' },
      { src: 'test-2.js', url: 'http://localhost:9484/test-2.js' },
      { src: 'test-3.js', url: 'http://localhost:9484/test-3.js' },
    ])

    assert.deepInclude(
      output,
      '<script type="module" data-test="test" src="http://localhost:9484/test.js"></script>'
    )

    assert.deepInclude(
      output,
      '<script type="module" src="http://localhost:9484/test-2.js"></script>'
    )

    assert.deepInclude(
      output,
      '<script type="module" data-test-3="42" src="http://localhost:9484/test-3.js"></script>'
    )
  })

  test('should provide a ')
})
