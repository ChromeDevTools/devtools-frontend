// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-check

const path = require('path');

const devtools_paths = require('../devtools_paths.js');
const devtools_plugin = require('./devtools_plugin.js');

// esbuild module uses binary in this path.
process.env.ESBUILD_BINARY_PATH = path.join(devtools_paths.devtoolsRootPath(), 'third_party', 'esbuild', 'esbuild');

const entryPoints = [process.argv[2]];
const outfile = process.argv[3];

const outdir = path.dirname(outfile);

const plugin = {
  name: 'devtools-plugin',
  setup(build) {
    // https://esbuild.github.io/plugins/#on-resolve
    build.onResolve({filter: /.*/}, args => {
      const res = devtools_plugin.devtoolsPlugin(args.path, args.importer);
      if (!res) {
        return null;
      }

      if (res.external) {
        // res.id can be both of absolutized local JavaScript path or node's
        // builtin module (e.g. 'fs', 'path'), and only relativize the path in
        // former case.
        if (path.isAbsolute(res.id)) {
          res.id = './' + path.relative(outdir, res.id);
        }

        return {
          external: res.external,
          path: res.id,
        };
      }

      return {
        path: res.id,
      };
    });
  },
};

require('esbuild')
    .build({
      entryPoints,
      outfile,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      plugins: [plugin],
    })
    .catch(err => {
      console.error('failed to run esbuild:', err);
      process.exit(1);
    });
