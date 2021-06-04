# Rollup Plugin import-meta-assets

Rollup plugin that detects assets references relative to modules using patterns such as `new URL('./assets/my-img.png', import.meta.url)`.

The referenced assets are added to the rollup pipeline, allowing them to be transformed and hash the filenames.

## How it works

A common pattern is to import an asset to get the URL of it after bundling:

```js
import myImg from './assets/my-img.png';
```

This doesn't work in the browser without transformation. This plugin makes it possible to use an identical pattern using `import.meta.url` which does work in the browser:

```js
const myImg = new URL('./assets/my-img.png', import.meta.url);
```

## Install

Using npm:

```
npm install @web/rollup-plugin-import-meta-assets --save-dev
```

## Usage

Create a rollup.config.js [configuration file](https://www.rollupjs.org/guide/en/#configuration-files) and import the plugin:

```js
import { importMetaAssets } from '@web/rollup-plugin-import-meta-assets';

export default {
  input: 'src/index.js',
  output: {
    dir: 'output',
    format: 'es',
  },
  plugins: [importMetaAssets()],
};
```

Then call `rollup` either via the [CLI](https://www.rollupjs.org/guide/en/#command-line-reference) or the [API](https://www.rollupjs.org/guide/en/#javascript-api).

## Documentation

See [our website](https://modern-web.dev/docs/building/rollup-plugin-import-meta-assets/) for full documentation.
