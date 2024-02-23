// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-check

import sourcemaps from 'rollup-plugin-sourcemaps';
import {terser} from 'rollup-plugin-terser';

const devtools_plugin = require('./devtools_plugin.js');

/** @type {function({configSourcemaps: boolean}): import("rollup").MergedRollupOptions} */
// eslint-disable-next-line import/no-default-export
export default commandLineArgs => ({
  treeshake: false,
  context: 'self',
  output: [{
    format: 'esm',
    sourcemap: Boolean(commandLineArgs.configSourcemaps),
  }],
  plugins: [
    terser(),
    {
      name: 'devtools-plugin',
      resolveId(source, importer) {
        return devtools_plugin.devtoolsPlugin(source, importer);
      },
    },
    sourcemaps(),
  ]
});
