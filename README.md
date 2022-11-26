# vite-plugin-adonis
> Vite plugin for AdonisJS

[![npm-image]][npm-url] [![license-image]][license-url] [![typescript-image]][typescript-url]

This plugin allows you to use AdonisJS with Vite as the assets bundler.

## Installation

```bash
npm i -D vite-plugin-adonis
```

## Usage

```ts

import { defineConfig } from 'vite'
import Adonis from 'vite-plugin-adonis'

export default defineConfig({
  plugins: [
    Adonis({
      entryPoints: {
        app: ['resources/js/app.ts'],
      }
    })
  ]
})
```

## Why and how ? 

This plugin is needed for the following reasons:

### Keep compatible API

The first Assets Bundler that was implemented for AdonisJS was Webpack Encore. Two things webpack encore is doing when you run the dev server, is :
- Generating a manifest.json file that contains all the assets with some metadata
- Generating a entrypoints.json file

These two files are used by AdonisJS to correctly load the assets in the views. Vite doesn't generate manifest file in dev mode, but we won't need it. The only drawback is, while in dev mode, AdonisJS won't be able to throw an error if you try to load an asset that doesn't exist.

However the entrypoints.json file is needed by AdonisJS, basically for the `entryPointStyles('entryPointName')` and `entryPointScripts('entryPointName')` helpers. This plugin will generate the entrypoints.json file based on the entryPoints option you pass to the plugin.

### Reload

The plugin also add a little method that will watch your `.edge` files and full-reload the page when a change is detected. 

### Configuration

The last thing this plugin is doing, is, basically just pre-configuring Vite for you. It will add all configuration needed to make AdonisJS work with Vite.

[npm-image]: https://img.shields.io/npm/v/@adonisjs/vite-plugin-adonis.svg?style=for-the-badge&logo=npm
[npm-url]: https://npmjs.org/package/vite-plugin-adonis "npm"

[license-image]: https://img.shields.io/npm/l/@adonisjs/vite-plugin-adonis?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md "license"

[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]:  "typescript"
