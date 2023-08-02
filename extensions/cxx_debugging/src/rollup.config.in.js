// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
// THIS FILE IS GENERATED, MODIFICATIONS WILL BE LOST!
/* eslint-disable */
debugger;

import {nodeResolve} from '@rollup/plugin-node-resolve';
import path from 'path';

const files = ['$<JOIN:@EXTENSION_BUNDLE_ENTRYPOINTS@,', '>'];
const sourcemap = '$<$<BOOL:@EXTENSION_BUNDLE_SOURCEMAP@>:inline>';

const resolveOptions = {
  customResolveOptions: {
    moduleDirectory: '@PROJECT_SOURCE_DIR@/third_party',
  },
  rootDir: '@PROJECT_SOURCE_DIR@',
  jail: '@PROJECT_SOURCE_DIR@',
  resolveOnly: ['lit-html'],
};

export default files.map(input => ({
                           input,
                           external: './SymbolsBackend.js',
                           output: {
                             file: `${path.basename(input, '.js')}.bundle.js`,
                             format: '@EXTENSION_BUNDLE_FORMAT@',
                             sourcemap,
                             sourcemapPathTransform(relativeSourcePath, sourcemapPath) {
                               return `file://${path.resolve(path.dirname(sourcemapPath), relativeSourcePath)}`;
                             }
                           },
                           plugins: [nodeResolve(resolveOptions)]
                         }));
