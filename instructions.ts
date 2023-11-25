/*
 * @next-edge/adonisjs-v5-vite
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */
import { join } from 'node:path'
import * as sinkStatic from '@adonisjs/sink'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

function getStub(...relativePaths: string[]) {
  // eslint-disable-next-line unicorn/prefer-module
  return join(__dirname, 'stubs', ...relativePaths)
}

export default async function instructions(
  projectRoot: string,
  app: ApplicationContract,
  sink: typeof sinkStatic
) {
  const adonisViteConfigPath = app.configPath('vite.ts')
  const adonisViteConfig = new sink.files.MustacheFile(
    projectRoot,
    adonisViteConfigPath,
    getStub('config.stub')
  )

  const viteConfigPath = app.makePath('vite.config.js')
  const viteConfig = new sink.files.MustacheFile(
    projectRoot,
    viteConfigPath,
    getStub('client_config.stub')
  )

  const viteEntrypointPath = app.makePath('resources/js/app.js')
  const viteEntrypoint = new sink.files.MustacheFile(
    projectRoot,
    viteEntrypointPath,
    getStub('js_entrypoint.stub')
  )

  const pkg = new sink.files.PackageJsonFile(projectRoot)

  let packagesToInstall = ['vite']

  // install dependency packages
  for (const packageToInstall of packagesToInstall) {
    pkg.install(packageToInstall, undefined, false)
  }
  const packageList = packagesToInstall
    .map((packageName) => sink.logger.colors.green(packageName))
    .join(', ')
  const spinner = sink.logger.await(`Installing dependencies: ${packageList}`)

  try {
    await pkg.commitAsync()
    spinner.update('Dependencies installed')
  } catch (error) {
    spinner.update('Unable to install some or all dependencies')
    sink.logger.fatal(error)
  }

  spinner.stop()

  // generate adonisViteConfig
  adonisViteConfig.overwrite = true
  adonisViteConfig.commit()
  sink.logger.action('create').succeeded(`created ${adonisViteConfigPath}`)

  // generate viteConfig
  viteConfig.overwrite = true
  viteConfig.commit()
  sink.logger.action('create').succeeded(`created ${viteConfigPath}`)

  // generate entrypoint
  viteEntrypoint.overwrite = true
  viteEntrypoint.commit()
  sink.logger.action('create').succeeded(`created ${viteEntrypoint}`)
}
