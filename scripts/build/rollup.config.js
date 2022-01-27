// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-check

import {defaultStrategy} from 'minify-html-literals/src/strategy';  // eslint-disable-line rulesdir/es_modules_import
import minifyHTML from 'rollup-plugin-minify-html-template-literals';
import {terser} from 'rollup-plugin-terser';

const devtools_plugin = require('./devtools_plugin.js');

/**
 * @type {import("minify-html-literals").Strategy<import("html-minifier").Options, unknown>}
 */
const minifyHTMLStrategy = {
  getPlaceholder() {
    return 'TEMPLATE_EXPRESSION';
  },
  combineHTMLStrings(parts, placeholder) {
    return defaultStrategy.combineHTMLStrings(parts, placeholder);
  },
  minifyHTML(html, options) {
    return defaultStrategy.minifyHTML(html, options);
  },
  minifyCSS(css, options) {
    return defaultStrategy.minifyCSS(css, options);
  },
  splitHTMLByPlaceholder(html, placeholder) {
    return defaultStrategy.splitHTMLByPlaceholder(html, placeholder);
  }
};

/** @type {function({configDCHECK: boolean}): import("rollup").MergedRollupOptions} */
// eslint-disable-next-line import/no-default-export
export default commandLineArgs => ({
  treeshake: false,
  context: 'self',
  output: [{
    format: 'esm',
  }],
  plugins: [
    minifyHTML({
      options: {
        strategy: minifyHTMLStrategy,
        minifyOptions: {
          collapseInlineTagWhitespace: false,
          collapseWhitespace: true,
          conservativeCollapse: true,
          minifyCSS: false,
          removeOptionalTags: true,
        },
      },
    }),
    terser({
      compress: {
        pure_funcs: commandLineArgs.configDCHECK ? ['Platform.DCHECK'] : [],
      },
    }),
    {
      name: 'devtools-plugin',
      resolveId(source, importer) {
        return devtools_plugin.devtoolsPlugin(source, importer);
      },
    },
  ]
});
