// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * This is a helper script to bundle the i18n.js library.
 * From the folder containing i18n.js, locales.js, and this script, run node buildI18nBundle.js
 * This will generate an unminified-i18n-bundle.js file that exports a module called i18n
 */

const commonjs = require('@rollup/plugin-commonjs');
const path = require('path');
const rollup = require('rollup');
const terser = require('rollup-plugin-terser');
const yargs = require('yargs');

const usageMessage = `A helper script to bundle the i18n.js library.
  From the folder containing i18n.js, locales.js, and this script, run:
    node buildI18nBundle.js [--minify].
  This will generate an unminified or a minified (if --minify is present)
  i18n-bundle.js that exports a module called i18n.`;
const prependHeaders = '// lighthouse.i18n 1.0.0, created with rollup.\n';
const prependWarn = '// DO NOT MODIFY: Generated with buildi18nBundle.js.\n';

async function main() {
  const args = yargs.parse(process.argv);
  let shouldMinify = false;
  let outputPath = __dirname;
  let i18nPath = path.normalize(path.join(__dirname, 'i18n.js'));

  if (args.output_path) {
    outputPath = args.output_path;
  }

  if (args.minify) {
    shouldMinify = true;
  }

  if (args.i18n_path) {
    i18nPath = args.i18n_path;
  }

  if (args.usage) {
    console.log(usageMessage);
    process.exit(0);
  }

  try {
    await bundleI18n(shouldMinify, outputPath, i18nPath);
    process.exit(0);
  } catch (e) {
    console.log(e.stack);
    process.exit(1);
  }
}

/**
 * Creates the patched version of i18n library.
 * @param {boolean} shouldMinify True if the output file should be minified,
 * false otherwise.
 * @param {boolean} outputPath The output path for generated files.
 * @param {boolean} i18nPath The path to i18n.js library.
 */
async function bundleI18n(shouldMinify, outputPath, i18nPath) {
  console.log('i18n Bundler: Bundling i18n...');
  const normalizedOutputPath = path.normalize(path.join(outputPath, 'i18n-bundle.js'));
  const options = {
    input: i18nPath,
    output: {
      file: normalizedOutputPath,
      format: 'esm',
      banner: (prependHeaders + prependWarn),
    },
    plugins: [commonjs()]
  };

  if (shouldMinify) {
    // preserve license after being minified.
    const terserOptions = {
      output: {
        comments: (node, comment) => {
          const text = comment.value;
          return /ts\-nocheck|lighthouse\.i18n/.test(text);
        },
      },
    };
    console.log('i18n Bundler: minifying i18n...');
    options.plugins.push(terser.terser(terserOptions));
  }

  const bundle = await rollup.rollup(options);
  const watcher = rollup.watch(options);
  watcher.on('event', event => {
    if (event.code === 'END') {
      console.log(`i18n Bundler: Written to ${outputPath}`);
      watcher.close();
    } else if (event.code === 'ERROR') {
      console.log(`i18n Bundler: Error on ${event}`);
      watcher.close();
    }
  });
  await bundle.write(options);
}

main();
