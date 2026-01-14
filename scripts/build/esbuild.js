// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-check

import os from 'node:os';
import path from 'node:path';

import {devtoolsRootPath} from '../devtools_paths.js';

import {esbuildPlugin} from './devtools_plugin.js';

// esbuild module uses binary in this path.
const binaryName = os.type() === 'Windows_NT' ? 'esbuild.exe' : 'esbuild';
process.env.ESBUILD_BINARY_PATH = path.join(
    devtoolsRootPath(),
    'third_party',
    'esbuild',
    binaryName,
);
// This needs to be after the ESBUILD_BINARY_PATH is set

const esbuild = await import('esbuild');

const entryPoints = [process.argv[2]];
const outfile = process.argv[3];
const additionalArgs = process.argv.slice(4);
const useSourceMaps = additionalArgs.includes('--configSourcemaps');
const minify = additionalArgs.includes('--minify');

const outdir = path.dirname(outfile);

const plugin = {
  name: 'devtools-plugin',
  setup(build) {
    // https://esbuild.github.io/plugins/#on-resolve
    build.onResolve({filter: /.*/}, esbuildPlugin(outdir));
  },
};

esbuild
    .build({
      entryPoints,
      outfile,
      bundle: true,
      format: 'esm',
      platform: 'browser',
      plugins: [plugin],
      sourcemap: useSourceMaps,
      minify,
    })
    .catch(err => {
      console.error('Failed to run esbuild:', err);
      console.error(
          '\nIf error includes `Host version "X" does not match binary version "Y", you need to run `gclient sync`',
      );
      process.exit(1);
    });
